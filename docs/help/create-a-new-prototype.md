# Create a new prototype

Visit the [create a prototype page](/create) to create a new prototype.

Describe what the form is for, what fields it should include, and any eligibility criteria or instructions for the user.

For example:
> Create a driving licence application form. Ask for name, email, date of birth, preferred contact methods, automatic or manual, and to explain any health problems. Must be a UK resident and over 17 years old.

Once created, the high-level structure of the prototype can be previewed in the "Structure" tab.

## Supported form and question fields

Each form contains the following data:

- A title
- A description
- A duration in minutes
- Instructional text for the user before they fill out the form
- Information for the user about what happens next when they have completed the form
- A list of questions

Each question contains the following data:

- A title
- Hint text (optional)
- Whether or not it is required, and if so, the error message that is shown if the user does not provide an answer
- A question type (see below)
- For a single-choice or multiple-choice question, a list of options
- For a date of birth question, minimum and maximum ages (if needed)

The form can contain the following question types:

- **address**: A postal address
- **bank details**: A person's bank details
- **country**: A country
- **date**: A calendar date, entered as a day, month, and year
- **date_of_birth**: A person's date of birth, entered as a day, month, and year
- **email**: An email address
- **emergency_contact_details**: Name and contact details for someone to contact in an emergency
- **file_upload**: A single file upload, such as a document or image
- **gbp_currency_amount**: A monetary amount in GBP
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
