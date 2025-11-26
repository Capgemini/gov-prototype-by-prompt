// Handle the refresh suggestions link click event
const refreshSuggestionsLink = document.getElementById(
    'refreshSuggestionsLink'
);
refreshSuggestionsLink.addEventListener('click', async function (event) {
    event.preventDefault();
    refreshSuggestionsLink.removeAttribute('href');
    refreshSuggestionsLink.textContent = 'refreshing...';

    // Make a GET request to generate suggestions
    fetch(`/prototype/{{ prototypeId }}/suggestions`, {
        method: 'GET',
    })
        .then(async (response) => {
            const responseJson = await response.json();
            if (!response.ok) {
                throw new Error(
                    responseJson.message ??
                        `${response.status} ${response.statusText}`
                );
            }
            // Update the suggestion buttons with the new suggestions
            suggestionButtons.forEach((button, index) => {
                if (
                    responseJson.suggestions &&
                    responseJson.suggestions.length > index
                ) {
                    button.textContent = responseJson.suggestions[index];
                    button.classList.remove('display-none');
                } else {
                    button.textContent = '';
                    button.classList.add('display-none');
                }
            });
            // If no suggestions are available, show a message
            if (responseJson.suggestions.length === 0) {
                document
                    .querySelector('.no-suggestions')
                    .classList.remove('display-none');
            } else {
                document
                    .querySelector('.no-suggestions')
                    .classList.add('display-none');
            }
            errorSummary.classList.add('display-none');
            refreshSuggestionsLink.href = 'javascript:;';
            refreshSuggestionsLink.textContent = 'refresh';
        })
        .catch((err) => {
            console.error(
                'There was a problem refreshing the suggestions:',
                err
            );
            errorSummary.classList.remove('display-none');
            errorDescription.textContent = err.message;
            refreshSuggestionsLink.href = 'javascript:;';
            refreshSuggestionsLink.textContent = 'refresh';
        });
});

// Handle the suggestion button click event
suggestionButtons.forEach((button) => {
    button.addEventListener('click', function () {
        textPromptInput.value = button.textContent.trim();
        if (promptTypeInput.value === 'json') {
            switchPromptTypeButton.click(); // Switch to text prompt if currently in JSON mode
        }
    });
});
