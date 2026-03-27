const ChatMessage = ({ role, content, index, isStreaming }: { role: string; content: string; index?: number; isStreaming?: boolean }) => {
  const isUser = role === 'user'
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`
        max-w-[70%] p-5 rounded-2xl shadow-lg
        ${isUser 
          ? 'bg-[#1a130f] text-white mr-8 border-none' 
          : 'bg-white border border-black/[0.04] mr-8'
        }
        ${isStreaming ? 'animate-pulse' : ''}
      `}>
        <p className="text-[15px] leading-relaxed whitespace-pre-wrap font-medium" style={{ fontFamily: 'var(--font-sans-face)' }}>{content}</p>
        {isStreaming && (
          <div className="flex gap-1 mt-3">
            <span className="w-2 h-2 bg-[#b87830] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
            <span className="w-2 h-2 bg-[#b87830] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
            <span className="w-2 h-2 bg-[#b87830] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
          </div>
        )}
      </div>
    </div>
  )
}

export default ChatMessage
