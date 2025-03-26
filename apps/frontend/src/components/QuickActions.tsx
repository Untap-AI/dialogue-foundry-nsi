interface QuickActionsProps {
  onActionClick: (actionText: string) => void
}

const QUICK_ACTIONS = [
  'Winery Hours',
  'Wine Tastings',
  'Event Spaces',
  'Wine Club',
  'Vineyard Tours',
  'Directions'
]

const QuickActions = ({ onActionClick }: QuickActionsProps) => {
  return (
    <div className="flex gap-[8px] p-[10px_15px] overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-color-[#555_#333]">
      {QUICK_ACTIONS.map(action => (
        <button
          key={action}
          className="bg-[#333] text-[#eee] p-[8px_12px] rounded-[15px] text-[13px] whitespace-nowrap cursor-pointer transition-colors hover:bg-[#444] flex-shrink-0"
          onClick={() => onActionClick(action)}
        >
          {action}
        </button>
      ))}
    </div>
  )
}

export default QuickActions
