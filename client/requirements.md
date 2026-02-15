## Packages
framer-motion | For smooth animations and transitions
date-fns | For formatting dates in conversation history
react-markdown | For rendering markdown in chat messages
remark-gfm | GitHub Flavored Markdown support for react-markdown

## Notes
The backend provides a streaming endpoint for chat messages at POST /api/conversations/:id/messages.
We need to handle SSE (Server-Sent Events) manually in the frontend using the fetch API and reading the stream.
The stream returns JSON chunks in the format `data: {"content": "..."}` or `data: {"done": true}`.
