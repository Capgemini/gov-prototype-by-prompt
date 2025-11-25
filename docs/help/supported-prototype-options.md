# Supported prototype options

A [JSON schema](/schema) used to generate prototypes consists of a form with a list of questions.

Note that JSON fields cannot contain double quotes `"`; these are replaced with `“`. Backslash characters `\` must be written as `\\`, otherwise they are not displayed.

## Form fields

Each form consists of the following fields:

- **title**: The title of the form in sentence case, for example "Register to vote" or "Apply for a driving licence"
- **duration**: A duration of how long it typically takes to complete the form in minutes
- **form_type**: A form type that's shown on the confirmation page, for example "registration" or "application"
- **show_progress_indicators**: Whether to show progress indicators to the user as they complete the form, true by default.
- **questions**: A list of questions (see below)
- Some description fields (see below)

### Description fields

Each form also has three description fields:

- **description**: The description shown on the start page
- **before_you_start**: What the user should do or know before starting the form on the start page
- **what_happens_next**: What happens next when the user has completed the form on the confirmation page

These description fields can include [Markdown](https://www.markdownguide.org/basic-syntax/) formatting. Newlines can be created by inserting `\n\n` where needed.

Supported Markdown features include:

- *Italic text* with `*italic*` or `_italic_`
- **Bold text** with `**bold**` or `__bold__`
- Links with `[link text](https://example.com)`
- Unordered lists with `- item 1` or `* item 2`
- Ordered lists with `1. item 1` or `2. item 2`

### Question fields

Each question contains the following fields:

- **question_text**: The question text
- **hint_text**: Hint text to help the user answer the question (optional)
- **required**: Whether or not it is required, and if so, the error message that is shown if the user does not provide an answer
- **detailed_explanation**: A detailed explanation if the question needs more context or instructions (optional). This consists of:
  - **question_title**: A question title
  - **explanation_text**: A detailed explanation text that is shown above the question, which can contain Markdown formatting as described above.
- **answer_type**: The type of answer the user can provide (see below)
- **options**: For a single-choice or multiple-choice question, a list of options
- **date_of_birth_minimum_age**: For a date of birth question, minimum age in years (optional)
- **date_of_birth_maximum_age**: For a date of birth question, maximum age in years (optional)

A form cannot have hint text and a detailed explanation at the same time. If both are present then the hint text will be removed.

The form can contain the following answer types:

- **address**: A postal address
- **bank_details**: A person's bank details
- **country**: A country
- **date**: A calendar date, entered as a day, month, and year
- **date_of_birth**: A person's date of birth, entered as a day, month, and year
- **email**: An email address
- **emergency_contact_details**: Name and contact details for someone to contact in an emergency
- **file_upload**: A single file upload, such as a document or image
- **gbp_currency_amount**: A monetary amount in Great British pounds (GBP)
- **multiple_choice**: Multiple choices from a list of options
- **name**: A person's name
- **nationality**: A nationality
- **national_insurance_number**: A UK National Insurance number
- **passport_information**: A person's passport details
- **phone_number**: A UK phone number
- **single_choice**: A single choice from a list of options
- **tax_code**: A UK tax code
- **text**: A short free-text answer
- **text_area**: A longer free-text answer, multiple sentences
- **vat_registration_number**: A UK VAT registration number

Hint text is not shown for **address**, **bank_details**, **date**, **date_of_birth**, **emergency_contact_details**, and **passport_information** question types.
