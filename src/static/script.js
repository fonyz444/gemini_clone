document.addEventListener('DOMContentLoaded', () => {
	const chatMessages = document.getElementById('chat-messages')
	const userInput = document.getElementById('user-input')
	const sendButton = document.getElementById('send-button')

	function addMessage(text, sender, type = 'text') {
		const messageElement = document.createElement('div')
		messageElement.classList.add('message', sender)

		if (type === 'code_block' && sender === 'bot') {
			const codeBlockRegex = /^(.*?)```(\w*\n)?([\s\S]*?)```(.*)$/s
			const match = text.match(codeBlockRegex)

			if (match) {
				const beforeCode = (match[1] || '').trim()
				const language = (match[2] || '').trim()
				const codeContent = match[3].trim()
				const afterCode = (match[4] || '').trim()

				if (beforeCode) {
					const textPart = document.createElement('p')
					textPart.textContent = beforeCode
					messageElement.appendChild(textPart)
				}

				const preElement = document.createElement('pre')
				const codeElement = document.createElement('code')
				if (language) {
					codeElement.classList.add(
						`language-${language.replace(/\n/g, '').toLowerCase()}`
					)
				}
				codeElement.textContent = codeContent
				preElement.appendChild(codeElement)
				messageElement.appendChild(preElement)

				if (afterCode) {
					const textPartAfter = document.createElement('p')
					textPartAfter.textContent = afterCode
					messageElement.appendChild(textPartAfter)
				}
			} else {
				const preElement = document.createElement('pre')
				const codeElement = document.createElement('code')
				codeElement.textContent = text
				preElement.appendChild(codeElement)
				messageElement.appendChild(preElement)
			}
		} else {
			messageElement.style.whiteSpace = 'pre-wrap'
			messageElement.textContent = text
		}

		chatMessages.appendChild(messageElement)
		chatMessages.scrollTop = chatMessages.scrollHeight
	}

	async function sendMessage() {
		const messageText = userInput.value.trim()
		if (messageText === '') return

		addMessage(messageText, 'user')
		userInput.value = ''
		userInput.style.height = 'auto'

		addMessage('Я думаю...', 'bot')

		try {
			const response = await fetch('/api/chat', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ message: messageText }),
			})

			const thinkingMessage = chatMessages.querySelector(
				'.message.bot:last-child'
			)
			if (thinkingMessage && thinkingMessage.textContent === 'Я думаю...') {
				thinkingMessage.remove()
			}

			if (!response.ok) {
				const errorData = await response
					.json()
					.catch(() => ({ reply: 'Ошибка сети или невалидный JSON ответ.' }))
				throw new Error(
					errorData.reply || `HTTP error! status: ${response.status}`
				)
			}

			const data = await response.json()
			addMessage(data.reply, 'bot', data.type)
		} catch (error) {
			console.error('Ошибка при отправке сообщения:', error)
			const thinkingMessageOnError = chatMessages.querySelector(
				'.message.bot:last-child'
			)
			if (
				thinkingMessageOnError &&
				thinkingMessageOnError.textContent === 'Я думаю...'
			) {
				thinkingMessageOnError.remove()
			}
			addMessage(
				error.message || 'Извините, произошла ошибка при связи с сервером.',
				'bot'
			)
		}
	}

	sendButton.addEventListener('click', sendMessage)

	userInput.addEventListener('keypress', event => {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault()
			sendMessage()
		}
	})

	userInput.addEventListener('input', () => {
		userInput.style.height = 'auto'
		userInput.style.height = userInput.scrollHeight + 'px'
	})

	setTimeout(() => {
		addMessage('Привет! Чем могу помочь?', 'bot')
	}, 500)
})
