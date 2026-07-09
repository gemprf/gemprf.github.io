/**
 * GEM-pRF Configuration Chatbot
 * AI-powered assistant for helping users configure GEM-pRF parameters
 */

class ConfigurationChatbot {
    constructor() {
        this.knowledgeBase = null;
        this.conversationHistory = [];
        this.isLoading = false;
        this.apiKey = null;
        this.useLocalMode = true; // Start in local mode until API is configured
        this.initializeChatbot();
    }

    async initializeChatbot() {
        // Load knowledge base
        try {
            const response = await fetch('/gemprf-configs/js/chatbot-knowledge-base.json');
            this.knowledgeBase = await response.json();
            console.log('Knowledge base loaded successfully');
        } catch (error) {
            console.error('Error loading knowledge base:', error);
        }

        // Initialize DOM elements
        this.setupUI();
        this.attachEventListeners();
    }

    setupUI() {
        // Check if chatbot container exists, if not create it
        const container = document.getElementById('chatbot-container');
        if (!container) {
            console.warn('Chatbot container not found in HTML');
            return;
        }

        // Initialize message display and input
        this.messagesContainer = document.getElementById('chatbot-messages') || this.createMessagesContainer();
        this.inputField = document.getElementById('chatbot-input') || this.createInputField();
        this.sendButton = document.getElementById('chatbot-send') || this.createSendButton();

        // Add welcome message
        this.addMessage('bot', 'Hi! 👋 I\'m your GEM-pRF assistant!\n\nAsk me about any configuration parameter. I\'m in beta, so I\'m still learning. Please help me get better by providing your [feedback](../support.html)!\n\n**Try asking:**\n{{What is batch size?}}\n{{What is GPU configuration?}}\n{{Difference between individual and concatenated runs?}}');
    }

    createMessagesContainer() {
        const container = document.getElementById('chatbot-messages');
        if (!container) return null;
        container.innerHTML = '';
        return container;
    }

    createInputField() {
        const input = document.getElementById('chatbot-input');
        if (!input) return null;
        return input;
    }

    createSendButton() {
        const button = document.getElementById('chatbot-send');
        if (!button) return null;
        return button;
    }

    attachEventListeners() {
        if (this.sendButton) {
            this.sendButton.addEventListener('click', () => this.handleSendMessage());
        }
        if (this.inputField) {
            this.inputField.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.handleSendMessage();
                }
            });
        }

        // Setup API configuration button
        const apiConfigBtn = document.getElementById('chatbot-api-config');
        if (apiConfigBtn) {
            apiConfigBtn.addEventListener('click', () => this.showAPIConfiguration());
        }

        // Setup popup toggle
        this.setupPopupToggle();
    }

    setupPopupToggle() {
        const btn = document.getElementById('ai-assistant-btn');
        const popup = document.getElementById('ai-popup-overlay');
        const closeBtn = document.getElementById('chatbot-close-btn');

        if (btn && popup) {
            btn.addEventListener('click', () => {
                popup.classList.toggle('open');
                btn.classList.toggle('active');
                if (popup.classList.contains('open') && this.inputField) {
                    setTimeout(() => this.inputField.focus(), 100);
                }
            });
        }

        if (closeBtn && popup) {
            closeBtn.addEventListener('click', () => {
                popup.classList.remove('open');
                if (btn) btn.classList.remove('active');
            });
        }
    }

    handleSendMessage() {
        const message = this.inputField.value.trim();
        if (!message) return;

        // Add user message to display
        this.addMessage('user', message);
        this.inputField.value = '';

        // Generate response
        this.generateResponse(message);
    }

    addMessage(sender, content) {
        if (!this.messagesContainer) return;

        const messageEl = document.createElement('div');
        messageEl.className = `chatbot-message chatbot-${sender}`;
        
        const contentEl = document.createElement('div');
        contentEl.className = 'chatbot-message-content';
        contentEl.innerHTML = this.formatMessageContent(content);
        
        messageEl.appendChild(contentEl);
        this.messagesContainer.appendChild(messageEl);
        
        // Add click handlers for sample questions
        if (sender === 'bot') {
            const questionBtns = contentEl.querySelectorAll('.sample-question');
            questionBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const question = btn.textContent;
                    this.inputField.value = question;
                    this.handleSendMessage();
                });
            });
        }
        
        // Auto-scroll to latest message
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;

        // Add to conversation history
        this.conversationHistory.push({ sender, content });
    }

    formatMessageContent(content) {
        // Convert markdown-like formatting to HTML
        let html = content
            .replace(/\n/g, '<br>')
            .replace(/\{\{([^}]+)\}\}/g, '<button class="sample-question">$1</button>')
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>');
        return html;
    }

    async generateResponse(userMessage) {
        this.isLoading = true;
        this.sendButton.disabled = true;
        this.inputField.disabled = true;

        try {
            // Try to use API if configured, fall back to local mode
            if (this.apiKey && !this.useLocalMode) {
                await this.getAPIResponse(userMessage);
            } else {
                this.getLocalResponse(userMessage);
            }
        } catch (error) {
            console.error('Error generating response:', error);
            this.addMessage('bot', 'Sorry, I encountered an error. Please try again.');
        } finally {
            this.isLoading = false;
            this.sendButton.disabled = false;
            this.inputField.disabled = false;
            this.inputField.focus();
        }
    }

    getLocalResponse(userMessage) {
        // Local mode: Search knowledge base and generate response
        const lowerMessage = userMessage.toLowerCase();
        let response = '';

        // Check if question is out of scope (not about configuration)
        if (this.isOutOfScope(lowerMessage)) {
            response = this.generateOutOfScopeResponse(lowerMessage);
            setTimeout(() => {
                this.addMessage('bot', response);
            }, 500);
            return;
        }

        // First check if this is a software info question
        const softwareResponse = this.searchSoftwareInfo(lowerMessage);
        if (softwareResponse) {
            response = softwareResponse;
        } else {
            // Search for relevant information in knowledge base
            const relevantParams = this.searchKnowledgeBase(lowerMessage);
            const relevantFAQs = this.searchFAQs(lowerMessage);

            // Only use results if they have high relevance
            if (relevantParams.length > 0 && relevantParams[0].score >= 90) {
                response = this.formatParameterResponse(relevantParams);
            } else if (relevantFAQs.length > 0 && relevantFAQs[0].score >= 60) {
                response = this.formatFAQResponse(relevantFAQs);
            } else {
                response = this.generateGenericResponse(userMessage);
            }
        }

        setTimeout(() => {
            this.addMessage('bot', response);
        }, 300); // Simulate thinking time
    }

    searchSoftwareInfo(query) {
        // Check if query is about software metadata
        const softwareKeywords = ['author', 'created', 'who', 'developer', 'license', 'copyright', 'citation', 'paper', 'university', 'vienna', 'contact', 'email', 'version', 'gem-prf', 'gpu-empowered'];
        const hasMetadataKeyword = softwareKeywords.some(keyword => query.includes(keyword));

        if (!hasMetadataKeyword) {
            return null;
        }

        const info = this.knowledgeBase.software_info;
        
        if (query.includes('author') || query.includes('who') || query.includes('created')) {
            return `**GEM-pRF Author & Credits**\n\n**Author**: ${info.author}\n**Affiliation**: ${info.affiliation}\n**Contact**: ${info.contact}\n\n**Citation**: ${info.paper_title}\nDOI: ${info.citation}\n\n**License**: ${info.license}`;
        }
        
        if (query.includes('version')) {
            return `**GEM-pRF Version**: ${info.version}\n\nYou're using the Configuration Generator for GEM-pRF version ${info.version}.`;
        }
        
        if (query.includes('paper') || query.includes('citation') || query.includes('published')) {
            return `**Publication**\n\n**Title**: ${info.paper_title}\n**DOI**: ${info.citation}\n**Author**: ${info.author}\n**Affiliation**: ${info.affiliation}`;
        }
        
        if (query.includes('license') || query.includes('copyright')) {
            return `**License & Copyright**\n\n${info.license}`;
        }
        
        if (query.includes('contact') || query.includes('email')) {
            return `**Contact Information**\n\n**Author**: ${info.author}\n**Email**: ${info.contact}\n**Affiliation**: ${info.affiliation}`;
        }
        
        if (query.includes('gem-prf') || query.includes('what is')) {
            return `**About GEM-pRF**\n\n**Full Name**: ${info.full_name}\n\n**Description**: ${info.description}\n\n**Purpose**: ${info.purpose}\n\n**Capabilities**:\n${info.capabilities.map(c => `• ${c}`).join('\n')}\n\n**Version**: ${info.version}\n**Author**: ${info.author} (${info.affiliation})`;
        }
        
        return null;
    }

    isOutOfScope(query) {
        // Detect questions that are NOT about configuration parameters
        const outOfScopePatterns = [
            // Support/help questions
            /how (to|do i) (get|find|contact|reach|obtain).*(support|help)/i,
            /where (to|can i) (get|find).*(support|help)/i,
            
            // Installation/usage questions
            /how (to|do i) (install|download|setup|run|use|start|execute)/i,
            /troubleshoot|debug|error|crash|fail|not working|doesn't work/i,
            /tutorial|guide|documentation|learn|example/i,
            
            // General software questions
            /(what|where) is (the )?(website|documentation|github|repo)/i
        ];

        return outOfScopePatterns.some(pattern => pattern.test(query));
    }

    generateOutOfScopeResponse(query) {
        return `**🚫 Out of Scope**\n\nThis chatbot only answers questions about **XML configuration file parameters**.\n\nYour question appears to be about: installation, support, troubleshooting, or general usage.\n\n**For help with:**\n• Installation & setup → Visit [installation guide](/installation.html)\n• General support → Visit [support page](/support.html)\n• Bug reports → Contact ${this.knowledgeBase.software_info.contact}\n• Documentation → Visit [configuration guide](/configuration.html)\n\n**Ask me about configuration parameters like:**\n• "What is visual_field?"\n• "What is default_gpu?"\n• "What is BIDS_enable?"`;
    }

    searchKnowledgeBase(query) {
        const results = [];
        const kb = this.knowledgeBase.parameters;
        const uiElements = this.knowledgeBase.ui_elements;
        const lowerQuery = query.toLowerCase();
        const queryWords = lowerQuery.split(/\s+/).filter(w => w.length > 2);

        // First check UI elements section for matching UI labels
        if (uiElements) {
            for (const [elementKey, elementData] of Object.entries(uiElements)) {
                if (elementKey === 'description') continue; // Skip description field
                
                // Check if query matches UI label
                if (elementData.ui_label && lowerQuery.includes(elementData.ui_label.toLowerCase())) {
                    // For UI-only features (like Config Filename Builder)
                    if (elementData.type === 'UI feature') {
                        return [{
                            name: elementData.name,
                            section: 'User Interface',
                            data: {
                                explanation: elementData.description,
                                use_case: elementData.note || '',
                                components: elementData.components ? Object.entries(elementData.components).map(([k,v]) => `• **${k}**: ${v}`).join('\n') : ''
                            },
                            score: 100
                        }];
                    }
                    
                    // For sections with subsections (like Search Space)
                    if (elementData.subsections) {
                        // Add main section description
                        if (elementData.description) {
                            results.push({
                                name: elementData.ui_label || elementKey,
                                section: elementData.section || elementData.ui_label,
                                data: {
                                    explanation: elementData.description,
                                    is_section: true
                                },
                                score: 99
                            });
                        }
                        
                        // Add all subsections and their parameters
                        for (const [subKey, subData] of Object.entries(elementData.subsections)) {
                            if (subData.ui_label && subData.xml_parameter) {
                                // Simple parameter within section
                                results.push({
                                    name: subData.ui_label,
                                    section: elementData.ui_label,
                                    data: {
                                        explanation: subData.description,
                                        xml_parameter: subData.xml_parameter,
                                        ui_label: subData.ui_label
                                    },
                                    score: 97
                                });
                            } else if (subData.parameters) {
                                // Subsection with multiple parameters
                                for (const [paramKey, paramData] of Object.entries(subData.parameters)) {
                                    results.push({
                                        name: paramData.ui_label || paramKey,
                                        section: `${elementData.ui_label} > ${subData.ui_label}`,
                                        data: {
                                            explanation: paramData.description,
                                            xml_parameter: paramData.xml_parameter,
                                            ui_label: paramData.ui_label
                                        },
                                        score: 97
                                    });
                                }
                            }
                        }
                        
                        if (results.length > 0) {
                            return results;
                        }
                    }
                    
                    // For regular UI elements that map to XML parameters
                    if (elementData.parameters) {
                        for (const [paramKey, paramData] of Object.entries(elementData.parameters)) {
                            results.push({
                                name: paramData.ui_label || paramKey,
                                section: elementData.ui_label || elementData.section,
                                data: {
                                    explanation: paramData.description,
                                    xml_parameter: paramData.xml_parameter,
                                    ui_label: paramData.ui_label
                                },
                                score: 98 // Very high score for UI label matches
                            });
                        }
                        if (results.length > 0) {
                            return results.slice(0, 3);
                        }
                    }
                    
                    // Single parameter UI element
                    if (elementData.xml_parameter) {
                        results.push({
                            name: elementData.ui_label,
                            section: elementData.section,
                            data: {
                                explanation: elementData.description,
                                xml_parameter: elementData.xml_parameter
                            },
                            score: 98
                        });
                        return results.slice(0, 1);
                    }
                }
            }
        }

        // Check if this is a UI-only feature (backward compatibility)
        const uiOnlyFeatures = [
            'config filename builder', 'filename builder', 'builder',
            'preview', 'download button', 'export button'
        ];
        
        if (uiOnlyFeatures.some(feature => lowerQuery.includes(feature))) {
            const uiBuilder = uiElements?.config_filename_builder;
            return [{
                name: uiBuilder?.name || 'UI Feature',
                section: 'User Interface',
                data: {
                    explanation: uiBuilder?.description || `The Config Filename Builder is a UI convenience tool on this webpage to help you generate descriptive filenames. It is NOT a configuration parameter in the XML file.`,
                    use_case: uiBuilder?.note || `Use the builder to create organized filenames, but this is just for your convenience in organizing files.`
                },
                score: 100
            }];
        }

        // Map UI labels/terms to XML parameter names
        const uiToParamMap = {
            'visual field': ['visual_field'],
            'stimulus directory': ['directory'],
            'stimulus settings': ['directory', 'binarization_enable', 'high_temporal_resolution'],
            'gpu settings': ['default_gpu', 'additional_available_gpus'],
            'gpu configuration': ['default_gpu', 'additional_available_gpus'],
            'batch settings': ['batches'],
            'grid settings': ['num_horizontal_prfs', 'num_vertical_prfs', 'default_spatial_grid_visual_field_radius'],
            'grid resolution': ['num_horizontal_prfs', 'num_vertical_prfs'],
            'sigma settings': ['num_sigmas', 'min_sigma', 'max_sigma'],
            'hrf settings': ['hrf_t', 'hrf_TR', 'hrf_peak_delay', 'hrf_under_shoot_delay'],
            'hrf parameters': ['hrf_t', 'hrf_TR', 'hrf_peak_delay', 'hrf_under_shoot_delay'],
            'refine fitting': ['enable', 'refinefit_on_gpu'],
            'bids settings': ['BIDS_enable', 'BIDS_run_type', 'basepath'],
            'bids configuration': ['BIDS_enable', 'BIDS_run_type', 'basepath'],
            'subject settings': ['sub', 'analysis'],
            'space': ['space'],
            'session': ['individual_ses'],
            'input source': ['BIDS_enable', 'basepath'],
            'data source': ['BIDS_enable', 'basepath']
        };

        // Check if query matches UI labels
        for (const [uiLabel, paramNames] of Object.entries(uiToParamMap)) {
            if (lowerQuery.includes(uiLabel)) {
                for (const [section, params] of Object.entries(kb)) {
                    for (const paramName of paramNames) {
                        if (params[paramName] && typeof params[paramName] === 'object') {
                            results.push({
                                name: paramName,
                                section: section,
                                data: params[paramName],
                                score: 95 // High score for UI label matches
                            });
                        }
                    }
                }
                if (results.length > 0) {
                    return results.slice(0, 3);
                }
            }
        }

        // Define significant/key parameters for quick lookup (XML parameter names)
        const keywordMap = {
            'visual field': ['visual_field'],
            'stimulus': ['directory', 'binarization_enable', 'binarization_threshold', 'high_temporal_resolution'],
            'gpu': ['default_gpu', 'additional_available_gpus'],
            'batch': ['batches'],
            'grid': ['num_horizontal_prfs', 'num_vertical_prfs', 'default_spatial_grid_visual_field_radius'],
            'sigma': ['num_sigmas', 'min_sigma', 'max_sigma'],
            'hrf': ['hrf_t', 'hrf_TR', 'hrf_peak_delay', 'hrf_under_shoot_delay'],
            'refine': ['enable', 'refinefit_on_gpu'],
            'bids': ['BIDS_enable', 'BIDS_run_type', 'basepath'],
            'subject': ['sub', 'analysis'],
            'space': ['space'],
            'session': ['individual_ses'],
        };

        // First pass: Check for direct keyword-to-parameter matches
        for (const [keyword, paramNames] of Object.entries(keywordMap)) {
            if (lowerQuery.includes(keyword)) {
                // Found a direct keyword match
                for (const [section, params] of Object.entries(kb)) {
                    for (const paramName of paramNames) {
                        if (params[paramName] && typeof params[paramName] === 'object') {
                            results.push({
                                name: paramName,
                                section: section,
                                data: params[paramName],
                                score: 100 // High priority for keyword matches
                            });
                        }
                    }
                }
                if (results.length > 0) {
                    return results.slice(0, 3);
                }
            }
        }

        // Second pass: Check for direct parameter name matches
        for (const [section, params] of Object.entries(kb)) {
            for (const [paramName, paramData] of Object.entries(params)) {
                if (typeof paramData === 'object' && paramData.explanation) {
                    const paramNameLower = paramName.toLowerCase();
                    
                    // Check if query words match the parameter name
                    if (queryWords.some(word => paramNameLower.includes(word))) {
                        results.push({
                            name: paramName,
                            section: section,
                            data: paramData,
                            score: 90 // High score for parameter name matches
                        });
                    }
                }
            }
        }

        // If we have good matches, return them
        if (results.length > 0) {
            return results.slice(0, 3);
        }

        // Third pass: Only if no direct matches found, do broader search
        // But be VERY strict about it
        for (const [section, params] of Object.entries(kb)) {
            for (const [paramName, paramData] of Object.entries(params)) {
                if (typeof paramData === 'object' && paramData.explanation) {
                    const text = `${paramName} ${paramData.explanation}`.toLowerCase();
                    
                    let matchScore = 0;
                    
                    // Only match if we have multiple significant word matches
                    const significantWords = ['visual', 'field', 'stimulus', 'batch', 'gpu', 'hrf', 'sigma', 'grid', 'bids', 'refine', 'fitting', 'receptive', 'analysis'];
                    const significantMatches = queryWords.filter(word => 
                        significantWords.some(sig => word.includes(sig)) && text.includes(word)
                    );
                    
                    // Only accept if we have at least 2 significant matches
                    if (significantMatches.length >= 2) {
                        matchScore = significantMatches.length * 15;
                    }
                    
                    if (matchScore > 0) {
                        results.push({
                            name: paramName,
                            section: section,
                            data: paramData,
                            score: matchScore
                        });
                    }
                }
            }
        }

        return results.sort((a, b) => b.score - a.score).slice(0, 3);
    }

    searchFAQs(query) {
        const results = [];
        const faqs = this.knowledgeBase.faqs;
        const lowerQuery = query.toLowerCase();
        const queryWords = lowerQuery.split(/\s+/).filter(w => w.length > 3);

        // VERY strict FAQ matching - require keywords in the question itself
        for (let index = 0; index < faqs.length; index++) {
            const faq = faqs[index];
            const questionLower = faq.question.toLowerCase();
            
            // Count how many query words appear in the FAQ question
            const matchedWords = queryWords.filter(word => questionLower.includes(word));
            
            // Require at least 2 query words in the question, or 1 if single-word query
            if (matchedWords.length >= 2 || (queryWords.length === 1 && matchedWords.length === 1)) {
                results.push({
                    index,
                    faq,
                    score: matchedWords.length * 30
                });
            }
        }

        return results.sort((a, b) => b.score - a.score).slice(0, 2);
    }

    formatParameterResponse(relevantParams) {
        let response = '**Here\'s what I found about your question:**\n\n';

        // Check if first item is a section description
        if (relevantParams.length > 0 && relevantParams[0].data.is_section) {
            const sectionItem = relevantParams[0];
            response += `**${sectionItem.name}**\n${sectionItem.data.explanation}\n\n`;
            
            // Show subsections/parameters
            if (relevantParams.length > 1) {
                response += `**Contains the following parameters:**\n\n`;
                relevantParams.slice(1).forEach((item, idx) => {
                    response += `**${idx + 1}. ${item.name}**`;
                    if (item.section) {
                        response += ` (${item.section})`;
                    }
                    response += `\n${item.data.explanation}\n`;
                    if (item.data.xml_parameter) {
                        response += `*XML Path:* \`${item.data.xml_parameter}\`\n`;
                    }
                    response += '\n';
                });
            }
        } else {
            // Regular parameter response
            relevantParams.forEach((item, idx) => {
                response += `**${idx + 1}. ${item.name}**`;
                if (item.section) {
                    response += ` (${item.section})`;
                }
                response += `\n${item.data.explanation}\n`;

                if (item.data.xml_parameter) {
                    response += `*XML Path:* \`${item.data.xml_parameter}\`\n`;
                }
                if (item.data.ui_label) {
                    response += `*UI Label:* "${item.data.ui_label}"\n`;
                }
                if (item.data.default) {
                    response += `*Default:* ${item.data.default}\n`;
                }
                if (item.data.example) {
                    response += `*Example:* ${item.data.example}\n`;
                }
                if (item.data.use_case) {
                    response += `*When to use:* ${item.data.use_case}\n`;
                }
                if (item.data.components) {
                    response += `*Components:*\n${item.data.components}\n`;
                }
                response += '\n';
            });
        }

        response += '_For more details, visit the [configuration guide](/configuration.html)_';
        return response;
    }

    formatFAQResponse(relevantFAQs) {
        let response = '**Here\'s relevant information from our FAQs:**\n\n';

        relevantFAQs.forEach((item, idx) => {
            response += `**Q${idx + 1}: ${item.faq.question}**\n`;
            response += `${item.faq.answer}\n\n`;
        });

        return response;
    }

    generateGenericResponse(userMessage) {
        const tips = this.knowledgeBase.tips;
        const randomTip = tips[Math.floor(Math.random() * tips.length)];

        // Provide more helpful context based on what they might be asking
        let helpText = `I couldn't find a direct match for that question in my knowledge base.\n\n`;
        
        helpText += `**Try asking about these topics:**\n`;
        helpText += `• **GPU Configuration**: "What is default_gpu?" or "How do I use multiple GPUs?"\n`;
        helpText += `• **Stimulus Settings**: "What is visual field?" or "What is binarization?"\n`;
        helpText += `• **Grid/Search Space**: "What is num_horizontal_prfs?" or "What is sigma?"\n`;
        helpText += `• **Data Input**: "What is BIDS?" or "What is file extension?"\n`;
        helpText += `• **HRF Parameters**: "What is HRF?" or "What is peak delay?"\n`;
        helpText += `• **General Topics**: "What is refine fitting?" or "What is batch size?"\n\n`;
        
        helpText += `**Or try these common questions:**\n`;
        helpText += `• "Who is the author?"\n`;
        helpText += `• "What is GEM-pRF?"\n`;
        helpText += `• "What is a pRF?"\n`;
        helpText += `• "When should I enable GPU?"\n\n`;

        helpText += `**Here's a helpful tip:** 💡 *${randomTip}*\n\n`;
        
        helpText += `**Resources:**\n` +
            `• [Configuration Guide](/configuration.html)\n` +
            `• [Sample Config](/assets/gemprf_config/sample_config.xml)\n` +
            `• [Home Page](/)`;

        return helpText;
    }

    async getAPIResponse(userMessage) {
        // Use Groq API (OpenAI-compatible, free)
        const systemPrompt = this.buildSystemPrompt();

        try {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        ...this.conversationHistory.map(msg => ({
                            role: msg.sender === 'user' ? 'user' : 'assistant',
                            content: msg.content
                        })),
                        { role: 'user', content: userMessage }
                    ],
                    temperature: 0.3,
                    max_tokens: 400
                })
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            if (data.choices && data.choices[0]) {
                const assistantMessage = data.choices[0].message.content;
                this.addMessage('bot', assistantMessage);
            } else {
                throw new Error('No response from API');
            }
        } catch (error) {
            console.error('Groq API Error:', error);
            // Fall back to local mode
            this.useLocalMode = true;
            this.addMessage('bot', '⚠️ API temporarily unavailable. Switching to local mode.\n\n' + this.generateGenericResponse(userMessage));
        }
    }

    buildSystemPrompt() {
        const kbString = JSON.stringify(this.knowledgeBase, null, 2);
        return `You are a strict configuration assistant for GEM-pRF. You ONLY answer questions about XML configuration parameters.

Knowledge Base:
${kbString}

CRITICAL RULES - ENFORCE STRICTLY:
1. SCOPE: Only answer questions about configuration file parameters, settings, and values
2. REJECT off-topic questions about: installation, troubleshooting, general usage, support, bugs, or non-configuration topics
3. For rejected questions, respond: "This question is not about configuration parameters. For general support, visit: [support page URL]"
4. ACCURACY: Only use exact information from the knowledge base - NEVER infer, guess, or hallucinate
5. BREVITY: Keep answers to 2-4 sentences maximum
6. VERIFICATION: If unsure whether question is about configuration, reject it

Valid question types: "What is parameter X?", "How do I set Y in the config?", "What's the default for Z?"
Invalid question types: "How to install?", "How to get support?", "Why is it crashing?", "How to use GEM-pRF?"

Format: Brief, accurate answer using only knowledge base facts.`;
    }

    showAPIConfiguration() {
        const apiKey = prompt(`Configure Groq API Key (FREE & FAST)

Get your free API key from: https://console.groq.com/keys

⭐ It's completely free - no credit card required!
⭐ Super fast inference with Mixtral 8x7B model
⭐ Better at understanding natural language

Paste your API key below (or leave blank to use offline mode):`);
        
        if (apiKey !== null) {
            if (apiKey.trim()) {
                this.apiKey = apiKey.trim();
                this.useLocalMode = false;
                this.addMessage('bot', '✅ Groq API key configured!\n\nI can now use advanced AI (Mixtral 8x7B) to better understand your configuration questions. This will provide much more accurate and helpful responses.\n\n💡 Tip: I can now understand natural language questions much better!');
            } else {
                this.useLocalMode = true;
                this.addMessage('bot', '📚 Using offline mode with local knowledge base.\n\nYou can still get help with configuration parameters, but add a Groq API key anytime for better understanding of complex questions.\n\n👉 Get a free key at: https://console.groq.com/keys');
            }
        }
    }

    // Helper method to get parameter info
    getParameterInfo(paramName) {
        for (const [section, params] of Object.entries(this.knowledgeBase.parameters)) {
            if (params[paramName]) {
                return {
                    name: paramName,
                    section,
                    data: params[paramName]
                };
            }
        }
        return null;
    }

    // Export conversation for reference
    exportConversation() {
        const conversation = this.conversationHistory.map(msg => 
            `${msg.sender.toUpperCase()}: ${msg.content}`
        ).join('\n\n');

        const element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(conversation));
        element.setAttribute('download', 'gemprf-config-chat.txt');
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    }
}

// Initialize chatbot when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.configChatbot = new ConfigurationChatbot();
});
