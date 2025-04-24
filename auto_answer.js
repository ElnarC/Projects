// ==UserScript==
// @name         Edgenuity Auto-Answer
// @namespace    http://tampermonkey.net/
// @version      1.7
// @description  Automatically answers Еԁɡеոᴜітү quiz questions using database or AI, submits when all questions complete
// @author       You
// @match        *://*.edgenuity.com/*
// @match        *://*.core.learn.edgenuity.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @connect      gist.githubusercontent.com
// @connect      generativelanguage.googleapis.com
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // Configuration
    const config = {
        gistUrl: 'https://gist.githubusercontent.com/ElnarC/01eea75516db444ad77d41785d39c843/raw',
        geminiApiKey: '', // Replace with your actual Gemini API key
        geminiApiUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash',
        checkInterval: 2000,
        autoAdvance: true,
        answerTextAreas: true,
        debug: true,
        maxAiRetries: 3
    };

    // Global variables
    let database = [];
    let checkTimer = null;
    let isProcessing = false;
    let isQuizActive = false;

    // UI Creation
    function createUI() {
        const container = document.createElement('div');
        container.id = 'auto-answer-controls';
        container.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: #fff;
            border: 1px solid #ccc;
            border-radius: 5px;
            padding: 10px;
            z-index: 9999;
            box-shadow: 0 0 10px rgba(0,0,0,0.2);
            font-family: Arial, sans-serif;
            font-size: 14px;
        `;

        container.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 5px;">Edgenuity Auto-Answer</div>
            <div id="auto-answer-status">Status: Initializing...</div>
            <div style="margin-top: 5px;">
                <button id="auto-answer-toggle" style="margin-right: 5px;">Start</button>
                <button id="auto-answer-next">Next Question</button>
            </div>
            <div style="margin-top: 5px;">
                <label>
                    <input type="checkbox" id="auto-answer-advance" ${config.autoAdvance ? 'checked' : ''}>
                    Auto Advance
                </label>
            </div>
            <div style="margin-top: 5px;">
                <label>
                    <input type="checkbox" id="auto-answer-textareas" ${config.answerTextAreas ? 'checked' : ''}>
                    Answer Text Areas
                </label>
            </div>
        `;

        document.body.appendChild(container);

        document.getElementById('auto-answer-toggle').addEventListener('click', toggleAutoAnswer);
        document.getElementById('auto-answer-next').addEventListener('click', () => processCurrentQuestion());
        document.getElementById('auto-answer-advance').addEventListener('change', function() {
            config.autoAdvance = this.checked;
        });
        document.getElementById('auto-answer-textareas').addEventListener('change', function() {
            config.answerTextAreas = this.checked;
        });
    }

    // Status Updates
    function updateStatus(message) {
        const statusElement = document.getElementById('auto-answer-status');
        if (statusElement) {
            statusElement.textContent = `Status: ${message}`;
        }
        if (config.debug) {
            console.log(`[Edgenuity Auto-Answer] ${message}`);
        }
    }

    // Toggle Auto-Answering
    function toggleAutoAnswer() {
        const button = document.getElementById('auto-answer-toggle');
        if (checkTimer) {
            clearInterval(checkTimer);
            checkTimer = null;
            button.textContent = 'Start';
            updateStatus('Stopped');
            isQuizActive = false;
        } else {
            checkTimer = setInterval(processCurrentQuestion, config.checkInterval);
            button.textContent = 'Stop';
            updateStatus('Running');
        }
    }

    // Find Correct Answer
    function findCorrectAnswer(questionId) {
        for (const entry of database) {
            if (entry.includes(questionId)) {
                const match = entry.match(/.*_([A-DTF])$/);
                if (match && match[1]) {
                    return match[1];
                }
            }
        }
        return null;
    }

    // Answer Multiple Choice
    function answerMultipleChoice(container, correctAnswer) {
        if (!correctAnswer) return false;

        updateStatus(`Answering with option ${correctAnswer}`);
        const radioButtons = container.querySelectorAll('input[type="radio"]');

        for (const radioButton of radioButtons) {
            if (radioButton.id.endsWith(`_${correctAnswer}`)) {
                radioButton.checked = true;
                radioButton.click();
                return true;
            }
        }

        const labels = container.querySelectorAll('.answer-choice-label');
        for (const label of labels) {
            const labelText = label.textContent.trim().toLowerCase();
            let matchesAnswer = false;

            if (correctAnswer === 'T' && labelText === 'true') matchesAnswer = true;
            if (correctAnswer === 'F' && labelText === 'false') matchesAnswer = true;
            if (correctAnswer.match(/[A-D]/) && labelText === correctAnswer.toLowerCase()) matchesAnswer = true;

            if (matchesAnswer) {
                const forAttr = label.getAttribute('for');
                if (forAttr) {
                    const radioButton = document.getElementById(forAttr);
                    if (radioButton) {
                        radioButton.checked = true;
                        radioButton.click();
                        return true;
                    }
                }
            }
        }

        updateStatus(`Failed to select option ${correctAnswer}`);
        return false;
    }

    // Get Multiple Choice Options
    function getMultipleChoiceOptions(container) {
        const options = [];
        const labels = container.querySelectorAll('.answer-choice-label');
        labels.forEach(label => {
            const text = label.textContent.trim();
            const forAttr = label.getAttribute('for');
            if (forAttr) {
                const radioButton = document.getElementById(forAttr);
                if (radioButton) {
                    const optionLetter = radioButton.id.split('_').pop();
                    options.push(`${optionLetter}: ${text}`);
                }
            }
        });
        return options;
    }

    // Answer Text Area
    async function answerTextArea(container, questionId) {
        if (!config.answerTextAreas) {
            updateStatus('Text area answering is disabled');
            return false;
        }

        const textArea = container.querySelector('textarea');
        if (!textArea) return false;

        const questionText = container.querySelector('.Practice_Question_Body div')?.innerText || '';
        updateStatus(`Generating answer for: ${questionText.substring(0, 30)}...`);

        try {
            const answer = await fetchGeminiAnswer(questionText);
            textArea.value = answer;
            textArea.dispatchEvent(new Event('input', { bubbles: true }));
            updateStatus('Text area answered with Gemini');
            return true;
        } catch (error) {
            updateStatus(`Gemini API error: ${error.message}`);
            return false;
        }
    }

    // Fetch Answer from Gemini API
    async function fetchGeminiAnswer(questionText, isMultipleChoice = false, options = []) {
        let attempts = 0;
        const validAnswers = options.map(opt => opt.split(':')[0].trim());

        while (attempts < config.maxAiRetries) {
            try {
                const answer = await new Promise((resolve, reject) => {
                    let prompt = '';
                    if (isMultipleChoice) {
                        prompt = `For this multiple-choice question: "${questionText}"\nOptions:\n${options.join('\n')}\n` +
                            `Return ONLY the letter of the correct answer (${validAnswers.join(', ')}) with no additional text, explanation, or punctuation.`;
                    } else {
                        prompt = `Provide a short, concise answer (1-2 sentences, max 50 words) to the following question for an Edgenuity quiz: "${questionText}"`;
                    }

                    GM_xmlhttpRequest({
                        method: 'POST',
                        url: `${config.geminiApiUrl}:generateContent?key=${config.geminiApiKey}`,
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        data: JSON.stringify({
                            "contents": [{
                                "parts": [{
                                    "text": prompt
                                }]
                            }]
                        }),
                        onload: response => {
                            if (response.status === 200) {
                                const data = JSON.parse(response.responseText);
                                const answer = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'Error: No answer returned';
                                resolve(answer);
                            } else {
                                reject(new Error(`API returned status ${response.status}`));
                            }
                        },
                        onerror: error => {
                            reject(new Error('Network error contacting Gemini API'));
                        }
                    });
                });

                if (isMultipleChoice) {
                    if (validAnswers.includes(answer)) {
                        return answer;
                    } else {
                        updateStatus(`AI returned invalid answer "${answer}" (attempt ${attempts + 1}/${config.maxAiRetries})`);
                        attempts++;
                        if (attempts === config.maxAiRetries) {
                            updateStatus('Max retries reached, selecting first option');
                            return validAnswers[0];
                        }
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                } else {
                    return answer;
                }
            } catch (error) {
                updateStatus(`Gemini API error on attempt ${attempts + 1}: ${error.message}`);
                attempts++;
                if (attempts === config.maxAiRetries) {
                    throw error;
                }
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }

    // Check if Test is Complete and Submit
    function checkAndSubmitTest() {
        const navItems = document.querySelectorAll('#navBtnList a');
        if (!navItems.length) return false;

        let allAnswered = true;
        navItems.forEach(item => {
            if (!item.classList.contains('answered')) {
                allAnswered = false;
            }
        });

        if (allAnswered) {
            const submitButton = document.querySelector('#submit.uibtn.uibtn-blue');
            if (submitButton && !submitButton.disabled) {
                updateStatus('All questions answered - submitting...');
                setTimeout(() => {
                    submitButton.click();
                    updateStatus('Test submitted');
                    clearInterval(checkTimer);
                    document.getElementById('auto-answer-toggle').textContent = 'Start';
                    isQuizActive = false;
                }, 1000);
                return true;
            }
        }
        return false;
    }

    // Find First Unanswered Question
    function findFirstUnansweredQuestion() {
        const navItems = document.querySelectorAll('#navBtnList a');
        for (const item of navItems) {
            if (!item.classList.contains('answered')) {
                item.click();
                return true;
            }
        }
        return false;
    }

    // Process Current Question
    async function processCurrentQuestion() {
        if (isProcessing) return;
        isProcessing = true;

        try {
            // Check if we're in a quiz/test section
            if (document.querySelector('#navBtnList')) {
                isQuizActive = true;
            }

            if (!isQuizActive) {
                updateStatus('Waiting for quiz/test section');
                isProcessing = false;
                return false;
            }

            // Check if all questions are answered and submit
            if (checkAndSubmitTest()) {
                isProcessing = false;
                return true;
            }

            const selectedLink = document.querySelector('#navBtnList a.selected');
            if (!selectedLink) {
                // If no question selected, find first unanswered
                if (findFirstUnansweredQuestion()) {
                    updateStatus('Moved to first unanswered question');
                } else {
                    updateStatus('No unanswered questions found');
                }
                isProcessing = false;
                return false;
            }

            const liElement = selectedLink.parentElement;
            if (!liElement || !liElement.id) {
                updateStatus('Could not find question ID from navigation');
                isProcessing = false;
                return false;
            }
            const questionId = liElement.id;

            const container = document.getElementById('q_' + questionId);
            if (!container) {
                updateStatus(`Question container not found for ID: ${questionId}`);
                isProcessing = false;
                return false;
            }

            updateStatus(`Processing question: ${questionId}`);
            const hasTextArea = container.querySelector('textarea') !== null;

            if (hasTextArea) {
                await answerTextArea(container, questionId);
            } else {
                let correctAnswer = findCorrectAnswer(questionId);
                if (correctAnswer) {
                    answerMultipleChoice(container, correctAnswer);
                } else {
                    const questionText = container.querySelector('.Practice_Question_Body div')?.innerText || '';
                    const options = getMultipleChoiceOptions(container);
                    if (options.length > 0) {
                        updateStatus(`Using AI for question: ${questionText.substring(0, 30)}...`);
                        try {
                            correctAnswer = await fetchGeminiAnswer(questionText, true, options);
                            answerMultipleChoice(container, correctAnswer);
                        } catch (error) {
                            updateStatus(`AI error: ${error.message}`);
                        }
                    } else {
                        updateStatus(`No options found for: ${questionId}`);
                    }
                }
            }

            if (config.autoAdvance) {
                const nextButton = document.querySelector('#nextQuestion');
                if (nextButton) {
                    setTimeout(() => {
                        nextButton.click();
                        updateStatus('Moved to next question');
                    }, 1000);
                } else {
                    // If no next button, loop back to first unanswered
                    if (findFirstUnansweredQuestion()) {
                        updateStatus('Looped back to first unanswered question');
                    } else if (!checkAndSubmitTest()) {
                        updateStatus('Waiting for next question');
                    }
                }
            }

            isProcessing = false;
            return true;
        } catch (error) {
            updateStatus(`Error: ${error.message}`);
            console.error('[Edgenuity Auto-Answer] Error:', error);
            isProcessing = false;
            return false;
        }
    }

    // Load Database from Gist
    function loadDatabaseFromGist() {
        updateStatus('Loading database from Gist...');
        GM_xmlhttpRequest({
            method: 'GET',
            url: config.gistUrl,
            onload: response => {
                if (response.status === 200) {
                    database = response.responseText.split('\n').filter(line => line.trim());
                    updateStatus(`Database loaded: ${database.length} entries`);
                    GM_setValue('edgenuity_database', database);
                    GM_setValue('edgenuity_database_timestamp', Date.now());
                } else {
                    updateStatus(`Fetch failed: ${response.status}`);
                    loadDatabaseFromLocalStorage();
                }
            },
            onerror: error => {
                updateStatus(`Fetch error: ${error.message}`);
                loadDatabaseFromLocalStorage();
            }
        });
    }

    // Load Database from Local Storage
    function loadDatabaseFromLocalStorage() {
        const savedDatabase = GM_getValue('edgenuity_database', null);
        const timestamp = GM_getValue('edgenuity_database_timestamp', 0);
        if (savedDatabase && savedDatabase.length) {
            database = savedDatabase;
            const age = Math.floor((Date.now() - timestamp) / (1000 * 60 * 60 * 24));
            updateStatus(`Loaded cached database (${age} days old): ${database.length} entries`);
            return true;
        }
        updateStatus('No cached database');
        return false;
    }

    // Initialize Script
    function initialize() {
        updateStatus('Initializing...');
        createUI();
        loadDatabaseFromGist();
        updateStatus('Ready - Waiting for quiz/test');
    }

    if (document.readyState === 'complete') {
        initialize();
    } else {
        window.addEventListener('load', initialize);
    }
})();
