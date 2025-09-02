function removeAllErrorClasses() {
    document.querySelectorAll('.govuk-error-message').forEach(function (el) {
        el.style.display = 'none';
    });
    document.querySelectorAll('.govuk-form-group').forEach(function (el) {
        el.classList.remove('govuk-form-group--error');
    });
    document.querySelectorAll('.govuk-select').forEach(function (el) {
        el.classList.remove('govuk-select--error');
    });
    document.querySelectorAll('.govuk-input').forEach(function (el) {
        el.classList.remove('govuk-input--error');
    });
    document.querySelectorAll('.govuk-textarea').forEach(function (el) {
        el.classList.remove('govuk-textarea--error');
    });
}

function addInputErrorClasses(inputElement, errorMessage) {
    const formGroup = inputElement.closest('.govuk-form-group');

    // Add the error message and display it
    const errorElement = formGroup.querySelector('.govuk-error-message');
    errorElement.style.display = '';
    errorElement.innerHTML = `<span class="govuk-visually-hidden">Error:</span> ${errorMessage}`;

    // Add error classes to the input and form group
    inputElement.classList.add('govuk-input--error');
    formGroup.classList.add('govuk-form-group--error');
}

function addSelectErrorClasses(inputElement, errorMessage) {
    if (!inputElement || !errorMessage) {
        return;
    }

    const parentElement = inputElement.closest('.govuk-form-group');
    const errorElement = parentElement?.querySelector('.govuk-error-message');

    if (errorElement) {
        errorElement.style.display = '';
        errorElement.innerHTML = `<span class="govuk-visually-hidden">Error:</span> ${errorMessage}`;
    }

    inputElement.classList.add('govuk-select--error');
    parentElement.classList.add('govuk-form-group--error');
}

/**
 * Adds error classes to date input fields.
 * @param {Element} dateInputGroup the date input group element
 * @param {Element[]} inputs the three date input elements (day, month, year)
 * @param {string} errorMessage the error message to display
 * @returns {void}
 */
function addDateInputErrorClasses(dateInputGroup, inputs, errorMessage) {
    if (!inputs || !errorMessage) return;

    // Add error classes to each input
    inputs.forEach((input) => {
        input.classList.add('govuk-input--error');
    });

    // Add and display the error message
    let errorElement = dateInputGroup.parentNode.querySelector(
        '.govuk-error-message'
    );
    errorElement.style.display = '';
    errorElement.innerHTML = `<span class="govuk-visually-hidden">Error:</span> ${errorMessage}`;

    // Add error class to the form group
    dateInputGroup.parentNode.parentNode.classList.add(
        'govuk-form-group--error'
    );
}

function addAllErrorClasses(errorMessage) {
    document.querySelectorAll('.govuk-error-message').forEach(function (el) {
        el.style.display = '';
        el.innerHTML = `<span class="govuk-visually-hidden">Error:</span> ${errorMessage}`;
    });
    document.querySelectorAll('.govuk-form-group').forEach(function (el) {
        el.classList.add('govuk-form-group--error');
    });
    document.querySelectorAll('.govuk-select').forEach(function (el) {
        el.classList.add('govuk-select--error');
    });
    document.querySelectorAll('.govuk-input').forEach(function (el) {
        el.classList.add('govuk-input--error');
    });
    document.querySelectorAll('.govuk-textarea').forEach(function (el) {
        el.classList.add('govuk-textarea--error');
    });
}

/**
 * Validate the date input fields.
 * This checks that the dates are valid and reasonable.
 * This also checks that the date of birth is in the past and meets any minimum or maximum age requirements.
 * @param {Element} dateInputGroup the date input group element
 * @param {Element} dayInput the day input element
 * @param {Element} monthInput the month input element
 * @param {Element} yearInput the year input element
 * @returns {boolean} true if there are errors, false otherwise
 */
function validateDateInput(dateInputGroup, dayInput, monthInput, yearInput) {
    // Check that the date inputs are present, valid numbers, and within a reasonable range
    if (
        dayInput.value.trim() === '' ||
        monthInput.value.trim() === '' ||
        yearInput.value.trim() === '' ||
        isNaN(dayInput.value) ||
        isNaN(monthInput.value) ||
        isNaN(yearInput.value) ||
        parseInt(dayInput.value) < 1 ||
        parseInt(dayInput.value) > 31 ||
        parseInt(monthInput.value) < 1 ||
        parseInt(monthInput.value) > 12 ||
        parseInt(yearInput.value) < 1 ||
        parseInt(yearInput.value) > 9999
    ) {
        addDateInputErrorClasses(
            dateInputGroup,
            [dayInput, monthInput, yearInput],
            dateInputGroup.getAttribute('data-invalid-error-text')
        );
        return true;
    }

    // Check that the date of birth is in the past
    if (dateInputGroup.hasAttribute('data-date-of-birth-error-text')) {
        const inputDate = new Date(
            parseInt(yearInput.value),
            parseInt(monthInput.value) - 1,
            parseInt(dayInput.value)
        );
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Set time to midnight for comparison
        if (inputDate > today) {
            addDateInputErrorClasses(
                dateInputGroup,
                [dayInput, monthInput, yearInput],
                dateInputGroup.getAttribute('data-date-of-birth-error-text')
            );
            return true;
        }
    }

    // Check that the date of birth is greater than or equal to the minimum age
    if (
        dateInputGroup.hasAttribute('data-date-of-birth-minimum-age') &&
        dateInputGroup.hasAttribute('data-date-of-birth-minimum-age-error-text')
    ) {
        const minimumAge = parseInt(
            dateInputGroup.getAttribute('data-date-of-birth-minimum-age')
        );
        const inputDate = new Date(
            parseInt(yearInput.value),
            parseInt(monthInput.value) - 1,
            parseInt(dayInput.value)
        );
        const latestDate = new Date();
        latestDate.setHours(0, 0, 0, 0); // Set time to midnight for comparison
        latestDate.setFullYear(latestDate.getFullYear() - minimumAge);
        // If user DoB is greater than the latest date, show error
        if (inputDate > latestDate) {
            addDateInputErrorClasses(
                dateInputGroup,
                [dayInput, monthInput, yearInput],
                dateInputGroup.getAttribute(
                    'data-date-of-birth-minimum-age-error-text'
                )
            );
            return true;
        }
    }

    // Check that the date of birth is smaller than or equal to the maximum age
    if (
        dateInputGroup.hasAttribute('data-date-of-birth-maximum-age') &&
        dateInputGroup.hasAttribute('data-date-of-birth-maximum-age-error-text')
    ) {
        const maximumAge = parseInt(
            dateInputGroup.getAttribute('data-date-of-birth-maximum-age')
        );
        const inputDate = new Date(
            parseInt(yearInput.value),
            parseInt(monthInput.value) - 1,
            parseInt(dayInput.value)
        );
        const earliestDate = new Date();
        earliestDate.setHours(0, 0, 0, 0);
        earliestDate.setFullYear(earliestDate.getFullYear() - maximumAge - 1); // Subtract one year to ensure the maximum age is inclusive
        // If user DoB is earlier or equal to the earliest date, show error
        if (inputDate <= earliestDate) {
            addDateInputErrorClasses(
                dateInputGroup,
                [dayInput, monthInput, yearInput],
                dateInputGroup.getAttribute(
                    'data-date-of-birth-maximum-age-error-text'
                )
            );
            return true;
        }
    }
    return false;
}

/**
 * Validate the text input field.
 * This checks that it is present if required, and that it matches the expected format for various types of inputs.
 * @param {Element} textInput the text input element
 * @returns {boolean} true if there are errors, false otherwise
 */
function validateTextInput(textInput) {
    const postcodeRegex = /^[a-z]{1,2}\d[a-z\d]?\s*\d[a-z]{2}$/i;
    const sortcodeRegex = /^(?!(?:0{6}|00-00-00))(?:\d{6}|\d\d-\d\d-\d\d)$/;
    const areDigitsRegex = /^\d+$/;
    const buildingSocietyRollRegex = /^[a-zA-Z0-9\-\/\. ]+$/;
    const passportNumberRegex = /^[A-Z0-9]{6,9}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const niRegex = /^[A-Z]{2}\d{6}[A-D]$/i;
    const phoneRegex = /^((0|44|\+44|\+44\(0\)|\+440))?(\d){9,10}$/;
    const taxCodeRegex =
        /^(NT|[SC]?(0T|D[0123]|BR|K[1-9]\d{0,5}|[1-9]\d{0,5}[LMNT])( W1| M1| X)?)$/i;
    const vatRegistrationNumberRegex = /^GB\d{9}|^\d{9}$/i;

    // Check if present if required
    if (
        textInput.hasAttribute('data-required-error-text') &&
        textInput.value.trim() === ''
    ) {
        addInputErrorClasses(
            textInput,
            textInput.getAttribute('data-required-error-text')
        );
        return true;
    } else if (textInput.value.trim() === '') {
        // If not required, do not validate further
        return false;
    }

    if (
        // Postcode
        textInput.hasAttribute('data-proper-postcode-error-text') &&
        !postcodeRegex.test(textInput.value.trim())
    ) {
        addInputErrorClasses(
            textInput,
            textInput.getAttribute('data-proper-postcode-error-text')
        );
        return true;
    } else if (
        // Bank Sort Code
        textInput.hasAttribute('invalid-sort-code') &&
        !sortcodeRegex.test(textInput.value.trim())
    ) {
        addInputErrorClasses(
            textInput,
            textInput.getAttribute('invalid-sort-code')
        );
        return true;
    } else if (
        // Bank Account Number format
        textInput.hasAttribute('invalid-account-number') &&
        !areDigitsRegex.test(textInput.value.trim())
    ) {
        addInputErrorClasses(
            textInput,
            textInput.getAttribute('invalid-account-number')
        );
        return true;
    } else if (
        // Bank Account Number length
        textInput.hasAttribute('invalid-account-number-length') &&
        (textInput.value.length < 6 || textInput.value.length > 8)
    ) {
        addInputErrorClasses(
            textInput,
            textInput.getAttribute('invalid-account-number-length')
        );
        return true;
    } else if (
        // Passport Number
        textInput.hasAttribute('invalid-passport-number') &&
        !passportNumberRegex.test(textInput.value.trim())
    ) {
        addInputErrorClasses(
            textInput,
            textInput.getAttribute('invalid-passport-number')
        );
        return true;
    } else if (
        // Building Society Roll Number length
        textInput.hasAttribute('invalid-length-building-society-number') &&
        textInput.value.length >= 18
    ) {
        addInputErrorClasses(
            textInput,
            textInput.getAttribute('invalid-length-building-society-number')
        );
        return true;
    } else if (
        // Building Society Roll Number format
        textInput.hasAttribute('invalid-characters-building-society-number') &&
        !buildingSocietyRollRegex.test(textInput.value.trim())
    ) {
        addInputErrorClasses(
            textInput,
            textInput.getAttribute('invalid-characters-building-society-number')
        );
        return true;
    } else if (
        // Email
        textInput.hasAttribute('data-email-error-text') &&
        !emailRegex.test(textInput.value.trim())
    ) {
        addInputErrorClasses(
            textInput,
            textInput.getAttribute('data-email-error-text')
        );
        return true;
    } else if (
        // National Insurance Number
        textInput.hasAttribute('data-national-insurance-number-error-text') &&
        !niRegex.test(textInput.value.replace(/\s/g, ''))
    ) {
        addInputErrorClasses(
            textInput,
            textInput.getAttribute('data-national-insurance-number-error-text')
        );
        return true;
    } else if (
        // Phone Number
        textInput.hasAttribute('data-phone-number-error-text') &&
        !phoneRegex.test(textInput.value.trim().replace(/\s/g, ''))
    ) {
        addInputErrorClasses(
            textInput,
            textInput.getAttribute('data-phone-number-error-text')
        );
        return true;
    } else if (
        // Tax Code
        textInput.hasAttribute('data-tax-code-error-text') &&
        !taxCodeRegex.test(textInput.value.trim())
    ) {
        addInputErrorClasses(
            textInput,
            textInput.getAttribute('data-tax-code-error-text')
        );
        return true;
    } else if (
        textInput.hasAttribute('data-vat-registration-number-error-text') &&
        !vatRegistrationNumberRegex.test(textInput.value.replace(/\s/g, ''))
    ) {
        // VAT Registration Number
        addInputErrorClasses(
            textInput,
            textInput.getAttribute('data-vat-registration-number-error-text')
        );
        return true;
    }
    return false;
}

// Validate the form on submit
function validateForm(event) {
    let hasErrors = false;

    // Clear all previous error messages
    removeAllErrorClasses();

    // Validate select inputs
    const selects = document.querySelectorAll(
        '.govuk-select[data-required-error-text]'
    );
    if (selects.length > 0) {
        selects.forEach((select) => {
            if (select.value === 'choose' || select.value.trim() === '') {
                addSelectErrorClasses(
                    select,
                    select.getAttribute('data-required-error-text')
                );
                hasErrors = true;
            }
        });
    }

    // Validate radio buttons
    const radioGroup = document.querySelector(
        '.govuk-radios[data-required-error-text]'
    );
    if (radioGroup) {
        const radios = document.querySelectorAll('.govuk-radios__input');
        let radioChecked = Array.from(radios).some((r) => r.checked);
        if (!radioChecked) {
            addAllErrorClasses(
                radioGroup.getAttribute('data-required-error-text')
            );
            event.preventDefault();
            return;
        }
    }

    // Validate checkboxes
    const checkboxGroup = document.querySelector(
        '.govuk-checkboxes[data-required-error-text]'
    );
    if (checkboxGroup) {
        const checkboxes = document.querySelectorAll(
            '.govuk-checkboxes__input'
        );
        let checkboxChecked = Array.from(checkboxes).some((r) => r.checked);
        if (!checkboxChecked) {
            addAllErrorClasses(
                checkboxGroup.getAttribute('data-required-error-text')
            );
            event.preventDefault();
            return;
        }
    }

    // Validate date inputs
    const dateInputGroups = document.querySelectorAll('.govuk-date-input');
    if (dateInputGroups.length > 0) {
        dateInputGroups.forEach((dateInputGroup) => {
            if (dateInputGroup) {
                // Get all the date input fields
                const dayInput = dateInputGroup.querySelector(
                    '.govuk-date-input__input--day'
                );
                const monthInput = dateInputGroup.querySelector(
                    '.govuk-date-input__input--month'
                );
                const yearInput = dateInputGroup.querySelector(
                    '.govuk-date-input__input--year'
                );

                // If they're required and any are empty, add error classes
                if (
                    dateInputGroup.hasAttribute('data-required-error-text') &&
                    (!dayInput.value.trim() ||
                        !monthInput.value.trim() ||
                        !yearInput.value.trim())
                ) {
                    addDateInputErrorClasses(
                        dateInputGroup,
                        [dayInput, monthInput, yearInput],
                        dateInputGroup.getAttribute('data-required-error-text')
                    );

                    hasErrors = true;
                }

                // If all date inputs are empty, do not validate further
                if (
                    dayInput.value.trim() === '' &&
                    monthInput.value.trim() === '' &&
                    yearInput.value.trim() === ''
                ) {
                    return;
                }

                // Complete further date validation
                if (
                    validateDateInput(
                        dateInputGroup,
                        dayInput,
                        monthInput,
                        yearInput
                    )
                ) {
                    hasErrors = true;
                }
            }
        });
    }

    // Validate text inputs
    document.querySelectorAll('.govuk-input').forEach((textInput) => {
        if (validateTextInput(textInput)) {
            hasErrors = true;
        }
    });

    // For date, text, and select inputs
    if (hasErrors) {
        event.preventDefault();
    }

    // Validate text areas
    const textarea = document.querySelector(
        '.govuk-textarea[data-required-error-text]'
    );
    if (textarea && textarea.value.trim() === '') {
        addAllErrorClasses(textarea.getAttribute('data-required-error-text'));
        event.preventDefault();
    }

    // Validate file uploads
    const fileUpload = document.querySelector(
        '.govuk-file-upload[data-required-error-text]'
    );
    if (fileUpload && fileUpload.value.trim() === '') {
        addAllErrorClasses(fileUpload.getAttribute('data-required-error-text'));
        event.preventDefault();
    }
}

document.addEventListener('DOMContentLoaded', function () {
    // Validate the form on submit
    const form = document.querySelector('form');
    if (form) {
        form.addEventListener('submit', validateForm);
    }

    // Create the error message element for all non-date inputs
    let labelElements = document.querySelectorAll(
        '.govuk-label:not(.govuk-date-input__label, .govuk-checkboxes__label, .govuk-radios__label)'
    );
    labelElements.forEach((labelElement, index) => {
        const errorElement = document.createElement('p');
        errorElement.className = 'govuk-error-message';
        errorElement.style.display = 'none';
        labelElement.parentNode.insertBefore(
            errorElement,
            labelElement.nextSibling
        );
    });

    // Create the error message element for all date inputs
    labelElements = document.querySelectorAll(
        '.govuk-label.govuk-date-input__label, .govuk-label.govuk-checkboxes__label, .govuk-label.govuk-radios__label'
    );
    labelElements.forEach((labelElement, index) => {
        const dateInputGroup = labelElement.closest(
            '.govuk-date-input, .govuk-checkboxes, .govuk-radios'
        );
        if (!dateInputGroup.parentNode.querySelector('.govuk-error-message')) {
            const errorElement = document.createElement('p');
            errorElement.className = 'govuk-error-message';
            errorElement.style.display = 'none';
            dateInputGroup.parentNode.insertBefore(
                errorElement,
                dateInputGroup.previousSibling
            );
        }
    });

    // Change the submit URL if the referrer is from check-answers
    const referrer = new URLSearchParams(window.location.search).get(
        'referrer'
    );
    if (referrer === 'check-answers') {
        const form = document.querySelector('form');
        if (form) {
            form.action = form.action.replace(
                /\/question-\d+/,
                '/check-answers'
            );
        }
    }
});
