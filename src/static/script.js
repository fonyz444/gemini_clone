document.addEventListener('DOMContentLoaded', () => {
	const chatMessages = document.getElementById('chat-messages')
	const userInput = document.getElementById('user-input')
	const sendButton = document.getElementById('send-button')

	function logDebug(message, data) {
		console.log(`[DEBUG] ${message}`, data)
	}

	function addMessage(text, sender, type = 'text') {
		const messageElement = document.createElement('div')
		messageElement.classList.add('message', sender)

		if (type === 'code_block' && sender === 'bot') {
			logDebug('Обрабатываю блок кода для Highlight.js', { text, type })

			const codeBlockContainer = document.createElement('div')
			codeBlockContainer.classList.add('code-block-container')

			const codeBlockRegex = /^(.*?)```(\w*\n)?([\s\S]*?)```(.*)$/s
			const match = text.match(codeBlockRegex)

			let codeContentToHighlight = text
			let language = ''

			if (match) {
				const beforeCode = (match[1] || '').trim()
				language = (match[2] || '').trim().replace(/\n/g, '').toLowerCase()
				codeContentToHighlight = match[3].trim()
				const afterCode = (match[4] || '').trim()

				logDebug('Разбор блока кода (Highlight.js)', {
					beforeCode,
					language,
					codeContentToHighlight:
						codeContentToHighlight.substring(0, 50) + '...',
					afterCode,
				})

				if (beforeCode) {
					const textPart = document.createElement('p')
					textPart.textContent = beforeCode
					messageElement.appendChild(textPart)
				}

				const preElement = document.createElement('pre')
				// For Highlight.js, the language class is typically on the <code> element or <pre>
				// Or it can auto-detect. We will add it to <code>.
				const codeElement = document.createElement('code')
				if (language) {
					// Highlight.js uses class names like "python", "javascript"
					// The `language-` prefix is also common and often supported or can be configured.
					// For simplicity, we'll stick to `language-python` as Highlight.js often handles it.
					codeElement.classList.add(`language-${language}`)
					logDebug(
						`Установлен класс language-${language} для Highlight.js`,
						codeElement
					)
				} else {
					// Attempt auto-detection or set a generic class if language is not specified by Gemini
					if (
						codeContentToHighlight.includes('def ') ||
						codeContentToHighlight.includes('import ')
					) {
						codeElement.classList.add('language-python')
						logDebug('Автоопределен язык Python для Highlight.js', codeElement)
					} else if (
						codeContentToHighlight.includes('function') ||
						codeContentToHighlight.includes('var ') ||
						codeContentToHighlight.includes('let ') ||
						codeContentToHighlight.includes('const ')
					) {
						codeElement.classList.add('language-javascript')
						logDebug(
							'Автоопределен язык JavaScript для Highlight.js',
							codeElement
						)
					} else {
						// If no language hint, Highlight.js will try to auto-detect from content
						// No specific class needed for auto-detection, but can add 'nohighlight' to prevent
						logDebug(
							'Язык не указан, Highlight.js попытается автоопределить',
							codeElement
						)
					}
				}

				codeElement.textContent = codeContentToHighlight
				preElement.appendChild(codeElement)
				codeBlockContainer.appendChild(preElement)

				const copyButton = document.createElement('button')
				copyButton.classList.add('copy-code-button')
				copyButton.textContent = 'Копировать'
				copyButton.addEventListener('click', () => {
					navigator.clipboard
						.writeText(codeContentToHighlight)
						.then(() => {
							copyButton.textContent = 'Скопировано!'
							setTimeout(() => {
								copyButton.textContent = 'Копировать'
							}, 2000)
						})
						.catch(err => {
							console.error('Ошибка копирования: ', err)
							copyButton.textContent = 'Ошибка'
							setTimeout(() => {
								copyButton.textContent = 'Копировать'
							}, 2000)
						})
				})
				codeBlockContainer.appendChild(copyButton)
				messageElement.appendChild(codeBlockContainer)

				if (afterCode) {
					const textPartAfter = document.createElement('p')
					textPartAfter.textContent = afterCode
					messageElement.appendChild(textPartAfter)
				}
			} else {
				logDebug(
					'Не удалось разобрать блок кода по регулярному выражению (Highlight.js)',
					{ text }
				)
				const preElement = document.createElement('pre')
				const codeElement = document.createElement('code')
				codeElement.textContent = text
				preElement.appendChild(codeElement)
				codeBlockContainer.appendChild(preElement)
				messageElement.appendChild(codeBlockContainer)
				logDebug(
					'Язык не указан (fallback), Highlight.js попытается автоопределить',
					codeElement
				)
			}
		} else {
			messageElement.style.whiteSpace = 'pre-wrap'
			messageElement.textContent = text
		}

		chatMessages.appendChild(messageElement)
		chatMessages.scrollTop = chatMessages.scrollHeight

		// Apply highlighting using Highlight.js
		if (type === 'code_block' && sender === 'bot') {
			const codeBlocks = messageElement.querySelectorAll('pre code')
			codeBlocks.forEach(block => {
				if (window.hljs) {
					logDebug(
						'Highlight.js найден в window, вызываем highlightElement()',
						block
					)
					try {
						window.hljs.highlightElement(block)
						logDebug(
							'Highlight.js highlightElement() выполнен успешно для блока',
							block
						)
					} catch (e) {
						console.error(
							'Ошибка при вызове Highlight.js highlightElement():',
							e
						)
					}
				} else {
					console.error(
						'Highlight.js (hljs) не найден в window после добавления сообщения'
					)
				}
			})
		}
	}

	async function sendMessage() {
		const messageText = userInput.value.trim()
		if (messageText === '') return

		addMessage(messageText, 'user')
		userInput.value = ''
		userInput.style.height = 'auto'

		const thinkingMessageElement = document.createElement('div')
		thinkingMessageElement.classList.add('message', 'bot', 'thinking')
		thinkingMessageElement.textContent = 'Я думаю...'
		chatMessages.appendChild(thinkingMessageElement)
		chatMessages.scrollTop = chatMessages.scrollHeight

		try {
			const response = await fetch('/api/chat', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ message: messageText }),
			})

			const thinkingMessages = chatMessages.querySelectorAll(
				'.message.bot.thinking'
			)
			thinkingMessages.forEach(msg => msg.remove())

			if (!response.ok) {
				const errorData = await response
					.json()
					.catch(() => ({ reply: 'Ошибка сети или невалидный JSON ответ.' }))
				throw new Error(
					errorData.reply || `HTTP error! status: ${response.status}`
				)
			}

			const data = await response.json()
			logDebug('Получен ответ от сервера (Highlight.js)', data)
			addMessage(data.reply, 'bot', data.type)
		} catch (error) {
			console.error('Ошибка при отправке сообщения:', error)
			const thinkingMessagesOnError = chatMessages.querySelectorAll(
				'.message.bot.thinking'
			)
			thinkingMessagesOnError.forEach(msg => msg.remove())
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

	if (window.hljs) {
		logDebug('Highlight.js (hljs) найден при загрузке страницы', window.hljs)
	} else {
		console.error(
			'Highlight.js (hljs) не найден при загрузке страницы. Убедитесь, что он подключен перед script.js.'
		)
	}

	setTimeout(() => {
		addMessage(
			'Привет! Я клон Gemini. Теперь я использую Highlight.js для подсветки кода. Пожалуйста, проверьте (Python, JS) и кнопку копирования.',
			'bot'
		)
	}, 500)
})
