

// enable darkmode  
document.querySelector('#darkmode').addEventListener('click', () => {
    document.body.classList.toggle('dark')
    document.querySelector('#chat-container').classList.toggle('dark')
    document.querySelector('#system-container').classList.toggle('dark')
    document.querySelector('#message').classList.toggle('dark')
    document.querySelector('#panel').classList.toggle('dark')
})