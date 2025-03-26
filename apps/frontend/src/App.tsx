import { useState } from 'react'
import { ChatWidget } from './components/ChatWidget'
import { ChatInterface } from './components/ChatInterface'

type TabType = 'chat' | 'widget'

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('widget')
  const [buttonColor, setButtonColor] = useState('#2563eb')
  const [position, setPosition] = useState<'bottom-right' | 'bottom-left'>(
    'bottom-right'
  )

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <header className="max-w-6xl mx-auto mb-8">
        <h1 className="text-3xl font-bold text-center text-blue-700 mb-2">
          Dialogue Foundry Chat Playground
        </h1>
        <p className="text-center text-gray-600">
          Test and develop your chat interface and widget in this playground
        </p>
      </header>

      <main className="max-w-6xl mx-auto bg-white rounded-xl shadow-md overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-6 py-4 text-sm font-medium ${
                activeTab === 'chat'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Chat Component
            </button>
            <button
              onClick={() => setActiveTab('widget')}
              className={`px-6 py-4 text-sm font-medium ${
                activeTab === 'widget'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Widget Demo
            </button>
          </nav>
        </div>

        <div className="p-8">
          {activeTab === 'chat' ? (
            <div className="h-[600px] border border-gray-200 rounded-lg overflow-hidden">
              <ChatInterface />
            </div>
          ) : (
            <div className="relative h-[600px] border border-gray-200 rounded-lg bg-gray-100">
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center mb-32 max-w-md">
                  <h2 className="text-xl font-semibold mb-2">Widget Demo</h2>
                  <p className="text-gray-600">
                    This is how your widget will appear when embedded on a
                    website. Check the{' '}
                    {position === 'bottom-right'
                      ? 'bottom right'
                      : 'bottom left'}{' '}
                    corner for the chat button.
                  </p>
                </div>
              </div>

              {/* Controls */}
              <div className="absolute top-4 left-4 p-4 bg-white rounded-lg shadow-sm z-10">
                <h3 className="font-medium text-gray-700 mb-3">
                  Widget Options
                </h3>

                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Position
                  </label>
                  <div className="flex space-x-4">
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        name="position"
                        checked={position === 'bottom-right'}
                        onChange={() => setPosition('bottom-right')}
                        className="h-4 w-4 text-blue-600"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        Bottom Right
                      </span>
                    </label>
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        name="position"
                        checked={position === 'bottom-left'}
                        onChange={() => setPosition('bottom-left')}
                        className="h-4 w-4 text-blue-600"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        Bottom Left
                      </span>
                    </label>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Button Color
                  </label>
                  <div className="flex items-center">
                    <input
                      type="color"
                      value={buttonColor}
                      onChange={e => setButtonColor(e.target.value)}
                      className="h-8 w-8 border border-gray-300 rounded mr-2"
                    />
                    <span className="text-sm text-gray-500">{buttonColor}</span>
                  </div>
                </div>

                <button
                  onClick={() => window.location.reload()}
                  className="text-sm px-3 py-1.5 bg-gray-100 hover:bg-gray-200 transition-colors rounded"
                >
                  Reset Widget
                </button>
              </div>

              {/* Widget */}
                <ChatWidget
                  position={position}
                  buttonColor={buttonColor}
                  defaultOpen={true}
                />
            </div>
          )}
        </div>
      </main>

      <footer className="max-w-6xl mx-auto mt-8 text-center text-gray-500 text-sm">
        <p>Dialogue Foundry Playground &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  )
}
