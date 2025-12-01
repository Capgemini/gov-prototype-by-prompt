const sharingForm = document.getElementById('sharingForm');
const workspaceSelect = document.getElementById('newWorkspaceId');
const userToAddInput = document.getElementById('userToAdd');
const sharedWithUserButtons = document.querySelectorAll(
    '.shared-with-users-table button'
);
const publicSharingRadios = document.querySelectorAll(
    'input[name="publicSharing"]'
);
const publicSharingPassword = document.getElementById('publicSharingPassword');
const sharingButton = document.getElementById('updateSharingButton');
const sharingLastUpdated = document.getElementById('sharingLastUpdated');

// Disable or enable sharing inputs
const disableSharingInputs = function (disabled) {
    const sharedWithUserButtons = document.querySelectorAll(
        '.shared-with-users-table button'
    );
    for (const element of [...publicSharingRadios, ...sharedWithUserButtons]) {
        element.disabled = disabled;
    }
};

// Handle saving sharing settings
const saveSharingSettings = async function () {
    // Get user IDs from the table
    const sharedWithUserButtons = document.querySelectorAll(
        '.shared-with-users-table button'
    );
    const sharedWithUserIds = [];
    for (const button of sharedWithUserButtons) {
        if (button.dataset?.userId && button.dataset?.userId !== 'none') {
            sharedWithUserIds.push(button.dataset.userId);
        }
    }

    // Get the selected workspace ID
    const workspaceId = workspaceSelect.value;

    // Get radio values from the form
    const publicSharingRadioValue = document.querySelector(
        'input[name="publicSharing"]:checked'
    ).value;

    // Check that the password is not empty if sharing publicly with password
    if (
        publicSharingRadioValue === 'doSharePubliclyWithPassword' &&
        publicSharingPassword.value.trim() === ''
    ) {
        errorSummary.classList.remove('display-none');
        errorDescription.innerHTML = 'Enter a password.';
        publicSharingPassword.classList.add('govuk-input--error');
        return;
    } else {
        errorSummary.classList.add('display-none');
        publicSharingPassword.classList.remove('govuk-input--error');
    }

    // Show processing state
    sharingButton.disabled = true;
    sharingButton.textContent = 'Processing...';
    publicSharingPassword.disabled = true;
    disableSharingInputs(true);

    // Request to create the prototype
    const data = {
        sharedWithUserIds: sharedWithUserIds,
        workspaceId: workspaceId,
    };
    if (publicSharingRadioValue === 'doNotSharePublicly') {
        data.livePrototypePublic = false;
    } else {
        data.livePrototypePublic = true;
        if (publicSharingRadioValue === 'doSharePubliclyWithPassword') {
            data.livePrototypePublicPassword = publicSharingPassword.value;
        } else {
            data.livePrototypePublicPassword = '';
        }
    }
    fetch(`/prototype/${prototypeId}/sharing`, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
            'Content-Type': 'application/json',
        },
    })
        .then(async (response) => {
            const responseJson = await response.json();
            copyPublicLinkButton.disabled = !data.livePrototypePublic;
            // If response is OK, show success, otherwise show error
            if (response.ok) {
                sharingLastUpdated.textContent = `Sharing settings saved today at ${new Date().toLocaleTimeString()}.`;
                sharingButton.disabled = false;
                sharingButton.textContent = 'Save public sharing';
                publicSharingPassword.disabled = false;
                disableSharingInputs(false);
            } else {
                throw new Error(
                    responseJson.message ??
                        `${response.status} ${response.statusText}`
                );
            }
        })
        .catch((err) => {
            errorSummary.classList.remove('display-none');
            errorDescription.textContent = err.message;
            sharingButton.disabled = false;
            sharingButton.textContent = 'Save public sharing';
            publicSharingPassword.disabled = false;
            disableSharingInputs(false);
        });
};
sharingForm.addEventListener('submit', async function (event) {
    event.preventDefault();
    await saveSharingSettings();
});

// Handle workspace selection change
workspaceSelect.addEventListener('change', async function (event) {
    event.preventDefault();
    await saveSharingSettings();
});

// Don't submit the form when the user presses enter
userToAddInput.addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {
        event.preventDefault();
    }
});

// Handle adding a user to share with
userToAddInput.addEventListener('keyup', async function (event) {
    if (event.key === 'Enter' && userToAddInput.value.trim() !== '') {
        event.preventDefault();
        errorSummary.classList.add('display-none');

        // Get user ID and name from the datalist
        const datalistOption = document.querySelector(
            'option[value="' + userToAddInput.value.trim() + '"]'
        );
        if (datalistOption) {
            const userId = datalistOption.dataset.userId;
            const tableBody = document.querySelector(
                '.shared-with-users-table tbody'
            );

            // Check if the user is already in the table
            const existingIds = [
                ...tableBody.querySelectorAll('tr button'),
            ].map((button) => {
                return button.dataset.userId;
            });
            if (existingIds.includes(userId)) {
                errorSummary.classList.remove('display-none');
                errorDescription.innerHTML = `User ${userToAddInput.value.trim()} already has access.`;
                return;
            }

            // Duplicate the example row
            const newRow = tableBody
                .querySelector('tr:nth-child(2)')
                .cloneNode(true);
            newRow.querySelector('td').textContent =
                `${datalistOption.dataset.userName} (${userToAddInput.value.trim()})`;
            for (const td of newRow.querySelectorAll('td')) {
                td.classList.remove('display-none');
            }
            newRow.querySelector('button').dataset.userId = userId;
            newRow
                .querySelector('button')
                .addEventListener('click', removeUserButtonOnClick);
            tableBody.appendChild(newRow); // Append the new row to the table
            userToAddInput.value = ''; // Clear the input field
            tableBody
                .querySelector('tr:nth-child(1) td')
                .classList.add('display-none'); // Hide the "Not shared with any users" row
            await saveSharingSettings();
        } else {
            errorSummary.classList.remove('display-none');
            errorDescription.innerHTML = `User ${userToAddInput.value.trim()} doesn't exist.`;
        }
    }
});

// Handle removing a user from the sharing table
const removeUserButtonOnClick = async function (event) {
    event.preventDefault();
    const userId = event.target.dataset.userId;
    if (userId && userId !== 'none') {
        event.target.closest('tr').remove();
    }
    // If no users are left in the table, show the "Not shared with any users" row
    if (
        document.querySelectorAll('.shared-with-users-table tbody tr')
            .length === 2
    ) {
        document
            .querySelector('.shared-with-users-table tbody tr:nth-child(1) td')
            .classList.remove('display-none');
    }
    await saveSharingSettings();
};

for (const button of sharedWithUserButtons) {
    button.addEventListener('click', removeUserButtonOnClick);
}
