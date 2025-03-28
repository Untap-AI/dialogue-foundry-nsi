# Chat Window Component

This directory contains the chat window component and its associated styles.

## Structure

- `ChatWindow.tsx` - The main React component
- `ChatWindow.css` - Core structural styles
- `chat-window-theme.css` - Theme integration

## CSS Architecture

The CSS for the chat window follows a modular, BEM-style approach with a separation of concerns:

### 1. Base Structure (ChatWindow.css)

Contains the core structural and functional styles:
- Dimensions and positioning
- Layout and structure
- State management (open/closing/closed)
- Responsive behavior
- Accessibility helpers

### 2. Theme Integration (chat-window-theme.css)

Contains all theme-specific styling:
- Colors and backgrounds
- Borders and shadows
- Animation timing
- Dark/light mode variants
- High contrast and print styles

## Usage

### Basic Component Usage

```jsx
import ChatWindow from './components/ChatWindow';

function App() {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  
  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 500);
  }
  
  return (
    <ChatWindow
      isOpen={isOpen}
      isClosing={isClosing}
      title="Chat Support"
      position="bottom-right"
      onClose={handleClose}
    />
  );
}
```

### Customizing Themes

The chat window uses the application theme system. To customize colors and other visual aspects:

1. Import the core theme variables from `../ChatInterface/css/theme-base.css`
2. Override variables as needed in your custom CSS

```css
:root {
  /* Override theme variables */
  --df-primary-color: #ff5500;
  --df-bg-primary: #f9f9f9;
}

/* Custom styles for chat window */
.chat-window {
  --chat-window-shadow-color: rgba(255, 85, 0, 0.15);
}
```

### CSS Class Structure

The component uses BEM-style naming:

- `.chat-window` - Base component
- `.chat-window--{position}` - Position variants (bottom-right, bottom-left)
- `.chat-window--{state}` - State variants (open, closing, closed)
- `.chat-window__content` - Child elements

### Responsive Behavior

The chat window is responsive by default:
- Full size on desktop (385px × 555px)
- Adjusts to screen size with max constraints
- Converts to full screen on mobile devices (<480px) 