# Dialogue Foundry Frontend

A React-based frontend for the Dialogue Foundry chat platform.

## Usage as a JavaScript Library

The frontend can be built as a standalone JavaScript library that can be embedded in any web page.

### Building the Library

```bash
npm run build
```

This will create a JavaScript-only build with CSS injected into the JS, located in the `dist` directory.

### Using the Library in a Web Page

Include the following in your HTML file:

```html
<!-- Load React dependencies -->
<script src="https://unpkg.com/react@19/umd/react.production.min.js" crossorigin></script>
<script src="https://unpkg.com/react-dom@19/umd/react-dom.production.min.js" crossorigin></script>

<!-- Load the DialogueFoundry library -->
<script src="path/to/index.js"></script>

<!-- Create a container for the chat widget -->
<div id="dialogue-foundry-root" style="height: 600px; width: 400px;"></div>

<script>
  // Initialize the chat widget
  if (window.DialogueFoundry) {
    const rootElement = document.getElementById('dialogue-foundry-root');
    DialogueFoundry.init(rootElement, {
      // Optional configuration
      theme: 'light', // or 'dark'
      chatConfig: {
        apiBaseUrl: 'https://your-api-url/api',
        companyId: 'your-company-id'
      },
      title: 'Your Chat Title',
      logoUrl: 'https://your-logo-url.png',
      personaOptions: {
        assistant: {
          name: 'Your Assistant Name',
          tagline: 'Your Assistant Tagline',
          avatar: 'https://your-avatar-url.png'
        }
      }
    });
  }
</script>
```

### Configuration Options

| Option | Type | Description |
|--------|------|-------------|
| `theme` | string | Color scheme: 'light' or 'dark' |
| `chatConfig.apiBaseUrl` | string | URL of the API backend |
| `chatConfig.companyId` | string | Company ID for the chat |
| `title` | string | Title displayed in the chat header |
| `logoUrl` | string | URL to the logo image |
| `personaOptions.assistant.name` | string | Name of the assistant |
| `personaOptions.assistant.tagline` | string | Tagline displayed under the assistant name |
| `personaOptions.assistant.avatar` | string | URL to the assistant avatar image |

## Development

### Running Locally

```bash
npm run dev
```

### Building for Production

```bash
npm run build
```

### Testing the Build

You can test the built library using the provided demo.html file:

```bash
npm run build
open demo.html
```

## Deployment

The library can be deployed to an S3 bucket:

```bash
npm run publish-package
```

This will upload the build to the configured S3 bucket with appropriate CORS headers. 