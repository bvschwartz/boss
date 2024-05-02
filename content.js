/*eslint no-unused-vars:1 no-constant-condition:1*/
console.log("wboss!")

/* 
    rowTiles:   data structure with all the guess tiles
    letterMap:  maps letter to info about them
    guesses:    data structure with all the guess
        { letter: l, evaluation: e }
        or
        { l: l, e: e }

 */
async function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)) }


async function main() {

//let needsUpdate = false
let guesses = []
let currentRow = -1
let currentCol = -1
let finished = false

let words = null
async function loadWords() {
    const url = chrome.runtime.getURL('words.json')
    let data = await fetch(url)
    words= await data.json()
    //console.log(words)
}
await loadWords()
console.log('loaded words...')
while (true) {
    await sleep(100)
    console.log('checking for header')
    if (document.getElementById('wordle-app-game') == null) continue
    if (document.getElementsByTagName('header').length == 0) continue
    if (!document.getElementsByTagName('header')[0].children) continue
    console.log('found header')
    break
}
//console.log('done sleeping')

function setBossTitle(title) {
    document.getElementsByTagName('header')[0].children[1].textContent = title
}

setBossTitle('Wordle Boss')

let app = document.getElementById('wordle-app-game')
console.log('app:', app)
//let boardContainer = document.getElementById('wordle-app-game').children[0]
let boardContainer = document.getElementsByClassName('Board-module_boardContainer__TBHNL')[0]
console.log('boardContainer:', boardContainer)
let board = boardContainer.children[0]
console.log('board:', board)
let keyboard = document.getElementById('wordle-app-game').children[1]
console.log('keyboard:', keyboard)
let keys = document.querySelectorAll('button[data-key]')
console.log('keys:', keys)
let letterMap = {}
// keys on virtual keyboard
for (let key of keys) {
    //console.log(key)
    let letter = key.getAttribute('data-key')
    letterMap[letter] = { target: key }
    key.onclick = function(e) {
        //console.log('onclick:', e.target)
    }
    key.addEventListener('click', e => {
        //console.log('click key:', key, 'letter:', letter)
        if (key.textContent == 'enter') {
            updateGuesses(3000)
        }
        else {
            checkLetter(letter)
        }
    })
}
console.log('letterMap:', letterMap)
let rows = Array.from(board.childNodes)
console.log('rows:', rows)
let rowTiles = rows.map(row => Array.from(row.childNodes))
console.log('rowTiles:', rowTiles)

function updateLetterTiles() {
    console.log("updateLetterTiles")
    // actual tiles on the board
    for (let key of keys) {
        //console.log(key)
        if (key.getAttribute('data-state') == 'absent') {
          key.style.opacity = 0
        }
        else {
          key.style.opacity = 1.0
        }
    }
}
function updateLetterTilesX() {
    // actual tiles on the board
    for (let row of rowTiles) {
        //console.log(row)
        let pos = 0
        for (let tile of row) {
            //console.log(tile)
            //tile.style['background-color'] = 'red'
            let letter = tile.textContent
            let evaluation = tile.firstChild.getAttribute('data-state')
            updateLetterMap(letter, evaluation, pos)
            pos++
        }
    }
}

/*
function findTile(tile) {
    let rowNum = 0
    for (let row of rowTiles) {
        let index = 0
        for (let t of row) {
            if (t == tile) {
                //console.log('found tile in row', rowNum, 'at', index)
            }
            index++
        }
        rowNum++
    }
}
*/

function updateGuessesNow() {
    guesses = rowTiles.map((row, rowNum) => {
        //console.log(rowNum, row)
        return row.map((tile, colNum) => {
            //console.log(rowNum, colNum, tile)
            let letter = tile.textContent
            let evaluation = tile.firstChild.getAttribute('data-state')
            return [ letter, evaluation ]
        })
    })
    //console.log('all guesses:', guesses)
    //console.log('current row:', getCurrentRow(guesses))
    findPossibleChoices()
    updateLetterTiles()
}
async function updateGuesses(delay) {
    await sleep(delay)
    console.log("updateGueess:", delay)
    updateGuessesNow()
}

updateGuesses(3000)
currentRow = getCurrentRow(guesses)
currentCol = getCurrentCol(guesses)

function getCurrentRow(guesses) {
    for (let i = 0; i < guesses.length; i++) {
        let row = guesses[i]
        let state = row[0][1] 
        if (state == 'empty' || state == 'tbd') {
            return i 
        }
    }
    return guesses.length
}

function getCurrentCol(guesses) {
    let row = rowTiles[currentRow]
    for (let i = 0; i < row.length; i++) {
        let tile = row[i]
        //console.log(tile)
        let letter = tile.textContent
        //console.log('state:', state)
        if (!letter) {
            //console.log('currentCol:', i)
            return i
        }
    }
    console.log('no currentCol')
    return -1
}

function updateLetterMap(letter, evaluation, position) {
    let div = letterMap[letter]
    if (!div) return
    if (div.correct || div.present) {
        return
    }
    else if (evaluation == 'correct') {
        div.correct = true
        div.target.style.opacity = 1.0
    }
    else if (evaluation == 'absent') {
        //console.log('updateLetterMap:', letter, evaluation, position, div)
        div.present = false
        div.target.style.opacity = 0
    }
}

document.addEventListener('keydown', e => {
    if (e.altKey || e.ctrlKey || e.shiftKey || e.metaKey) {
        //console.log('keydown: special key', e.key)
    }
    else if (e.key == 'Enter') {
        updateGuesses(3000)
    }
    else if (e.key.length == 1 && /[a-z]/.test(e.key)) {
        //console.log('keydown:', e.key)
        checkLetter(e.key)
    }
})

function checkLetter(letter) {
    currentRow = getCurrentRow(guesses)
    currentCol = getCurrentCol(guesses)
    if (currentCol < 0) {
        return false
    }
    let r = checkWrongLetter(letter) 
    if (r) {
        console.log('the letter must be wrong!')
        playWrong()
    }
    return false
}

// return true if the letter must be wrong
function checkWrongLetter(letter) {
    //console.log('checkWrongLetter:', letter, 'column:', currentCol)
    let absents = 0
    let presents = 0
    for (let i = 0; i < guesses.length; i++) {
        let row = guesses[i]
        let guess = row[currentCol]
        // if the letter was already tried in this column...
        if (guess[0] == letter) {
            if (guess[1] == 'absent') {
                return true
            }
            if (guess[1] == 'present') {
                return true
            }
            if (guess[1] == 'correct') {
                return false
            }
        }
        else if (guess[1] == 'correct') {
            return true
        }
        // note check all the guesses
        for (let j = 0; j < row.length; j++) {
            let guess = row[j]
            if (guess[0] == letter) {
                if (guess[1] == 'absent') absents++
                if (guess[1] == 'present') presents++
            }
        }
    }
    return absents > 0 && presents < 1 
}
function findPossibleChoices() {
    if (!guesses) {
        console.log('no guesses yet')
        return words
    }
    let absentCount = 0
    let presentCount = 0
    let congrats = false
    //console.log(JSON.stringify(guesses, null, 4))
    const possible = words.filter(function(word) {
        for (let i = 0; i < guesses.length; i++) {
            let row = guesses[i]
            let correctCount = 0
            for (let pos = 0; pos < row.length; pos++) {
                let guess = row[pos]
                let letter = guess[0]
                let evaluation = guess[1]
                if (evaluation == 'absent') {
                    if (word.charAt(pos) == letter) {
                        absentCount++
                        return false
                    }
                    if (word.includes(letter)) {
                        // check if the letter repeats, may have a 'present' or 'correct'
                        let counts = row.filter(item => item[0] == letter && item[1] != 'absent')
                        if (counts == 0) {
                            absentCount++
                            return false
                        }
                    }
                }
                else if (evaluation == 'present') {
                    if (!word.includes(letter)) {
                        presentCount++
                        return false
                    }
                    if (word.charAt(pos) == letter) {
                        presentCount++
                        return false
                    }
                }
                else if (evaluation == 'correct') {
                    if (word.charAt(pos) == letter) {
                        correctCount++
                    }
                    else {
                        return false
                    }
                }
            }
            if (correctCount == 5) {
                congrats = true
                return false
            }
        }
        return true
    })
    let msg = congrats ? "Congratulations!" : `${possible.length} words left`
    setBossTitle(`Wordle Boss: ${msg}`)
    console.log('absent:', absentCount, 'present:', presentCount, 'others', (words.length - absentCount - presentCount))
    console.log('possible:', possible)

    if (congrats) {
        if (!finished) {
            playRight()
        }
        finished = true
    }
    return possible
}

async function playAudio(sound) {
    try {
        await sound.play()
    }
    catch (error) {
        console.log('could not play sound')
    }
}

async function playWrong() {
    if (Math.random() < 0.7) {
        playAudio(audioDontDoThat)
    }
    else {
        playAudio(audioDang)
    }
}
function playRight() {
    playAudio(audioLooking)
}

var audioLucky = new Audio(chrome.runtime.getURL('audio/nap-luucky.mp3'))
var audioDang = new Audio(chrome.runtime.getURL('audio/nap-ddang.mp3'))
var audioDontDoThat = new Audio(chrome.runtime.getURL('audio/swluke01.mp3'))
var audioLooking = new Audio(chrome.runtime.getURL('audio/heres-looking.mp3'))


console.log('running...')
}
main()
