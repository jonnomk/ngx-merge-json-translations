# Angular merge JSON translations

This builder helps merge the messages.json file, after running extract-i18n, into target files using specified locales taking care to delete removed keys and add new ones.

## Getting Started

### Install the builder

In the Angular workspace root folder, run this command to install the builder:

```bash
npm install ngx-merge-json-translations --save-dev
```

### Add the builder to your project

```
{
  "projects": {
    "my-project": {
      "merge-json-translations": {
        "builder": "ngx-merge-json-translations:merge-json-translations",
        "options": {
          "locales": [
            "en-GB"
          ],
          "source": "src/i18n",
          "destination": "src/i18n",
          "sourceFile": "messages.json",
          "indent": '\t'
        }
      }
    }
  }
}
```

### Run it

To generare the json files run:

```bash
ng run [PROJECT_NAME]:merge-json-translations
```

### Options

In your `angular.json`, you can configure your `options` with the following:

| Name | Default | Description |
| :- | :- | :- |
| `locales` | `[]` | An array of locales that will be used to generate or update target files, i.e. `["en-GB", "fr"]` |
| `source` | `src/i18n` | The directory from which to find your source file, normally `src/i18n` |
| `destination` | `src/i18n` | The directory to which the target files will be added or updated |
| `sourceFile` | `messages.json` | The filename of the source file that the builder will look for in the source directory |
| `indent` | `'\t'` | The indentation to use for the resulting JSON. Options are any string or number.  Default is tabbed. |

\
Please note, if your `sourceFile` is named `messages.json`, then your translation files will use the same file stem i.e. `messages.en-GB.json`.
