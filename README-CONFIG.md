# Dialogue Foundry Configuration Guide

This guide explains how to configure and customize the Dialogue Foundry chat widget when embedding it in your website.

## Quick Start

To embed Dialogue Foundry in your website, include the compiled JavaScript bundle and specify your configuration:

```html
<!DOCTYPE html>
<html>
<head>
  <title>My Website with Dialogue Foundry</title>
  <!-- Your other head content -->
</head>
<body>
  <!-- Your website content -->
  
  <!-- Root element where the chat widget will be mounted -->
  <div id="dialogue-foundry-root"></div>
  
  <!-- Configuration Script (Method 1: Inline script with JSON) -->
  <script id="dialogue-foundry-config" type="application/json">
    {
      "apiBaseUrl": "https://your-api-url.com",
      "personaOptions": {
        "assistant": {
          "name": "Your Assistant Name",
          "avatar": "https://your-domain.com/avatar.png"
        }
      }
    }
  </script>
  
  <!-- Alternatively, you can use Method 2 or 3 described below -->
  
  <!-- Dialogue Foundry Script -->
  <script src="https://cdn.your-domain.com/dialogue-foundry.js"></script>
</body>
</html>
```

## Configuration Methods

There are three ways to configure Dialogue Foundry:

### Method 1: Include configuration as a JSON script tag

Add a script tag with the ID `dialogue-foundry-config` containing your JSON configuration:

```html
<script id="dialogue-foundry-config" type="application/json">
  {
    "apiBaseUrl": "https://your-api-url.com",
    "theme": {
      "colorScheme": "dark"
    }
  }
</script>
```

### Method 2: Define a global configuration object

Define a global `dialogueFoundryConfig` object before loading the Dialogue Foundry script:

```html
<script>
  window.dialogueFoundryConfig = {
    apiBaseUrl: "https://your-api-url.com",
    theme: {
      colorScheme: "dark"
    }
  };
</script>
<script src="https://cdn.your-domain.com/dialogue-foundry.js"></script>
```

### Method 3: Host a JSON configuration file

Host a file named `dialogue-foundry-config.json` in the root of your website:

```
/
├── index.html
├── dialogue-foundry-config.json
└── ...
```

The Dialogue Foundry script will automatically attempt to load this file if other configuration methods are not present.

## Configuration Options

Below are all the available configuration options:

| Option | Type | Description |
|--------|------|-------------|
| `apiBaseUrl` | string | The base URL for API requests |
| `tokenStorageKey` | string | LocalStorage key for the auth token |
| `chatIdStorageKey` | string | LocalStorage key for the chat ID |
| `personaOptions.assistant.name` | string | Name of the assistant |
| `personaOptions.assistant.avatar` | string | URL to the assistant's avatar image |
| `personaOptions.assistant.tagline` | string | Tagline displayed by the assistant |
| `theme.colorScheme` | "light" \| "dark" | The color scheme of the widget |
| `theme.fontFamily` | string | Font family for the chat interface |
| `theme.backgroundColor` | string | Background color of the chat |
| `theme.textColor` | string | Default text color |
| `theme.userMessageBgColor` | string | Background color for user messages |
| `theme.userMessageTextColor` | string | Text color for user messages |
| `theme.assistantMessageBgColor` | string | Background color for assistant messages |
| `theme.assistantMessageTextColor` | string | Text color for assistant messages |
| `theme.primaryButtonBgColor` | string | Background color for primary buttons |
| `theme.primaryButtonTextColor` | string | Text color for primary buttons |
| `widget.position` | "bottom-right" \| "bottom-left" | Position of the chat widget |
| `widget.buttonColor` | string | Color of the chat button |
| `widget.defaultOpen` | boolean | Whether the chat is open by default |
| `initialMessages` | array | Initial messages to display in the chat |

See the sample configuration file (`public/dialogue-foundry-config.sample.json`) for a complete example.

## Sample Configuration

A sample configuration file is included in the repository at `public/dialogue-foundry-config.sample.json`. You can use this as a starting point for your own configuration.

## Development

During development, you can pass the configuration directly to the `ConfigProvider` component:

```jsx
import { ConfigProvider } from './contexts/ConfigContext';

// Your development configuration
const devConfig = {
  apiBaseUrl: 'http://localhost:3000/api',
  theme: {
    colorScheme: 'light'
  }
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ConfigProvider initialConfig={devConfig}>
      <App />
    </ConfigProvider>
  </React.StrictMode>
);
```

## Build for Production

When building for production, the application will automatically look for configuration in the following order:

1. Global `window.dialogueFoundryConfig` object
2. Script tag with ID `dialogue-foundry-config`
3. JSON file at `/dialogue-foundry-config.json`
4. Fall back to default configuration

## Troubleshooting

If your configuration isn't being applied:

1. Check browser console for any errors
2. Verify JSON syntax in your configuration
3. Make sure the configuration is loaded before the Dialogue Foundry script
4. Check that the configuration object or script tag uses the correct ID/variable name 