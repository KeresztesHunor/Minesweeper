const WIDTH = 30;
const HEIGHT = 30;

const BOMB_COUNT = 150;

const NUMBER_COLOR_CLASSES = [
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight"
];

let playingField;
let resizablesStyle;

let numFieldsLeft;
let numBombsToBePut;

let numFieldsNotUncovered;

let gameOver;

let fieldGrid;
let valueFields;
let coverFields;
let overlayFields;

let clickedField = firstUncoverInitializer;

window.addEventListener("load", () =>
{
    //Initialize field grid

    const FIELDGRID_INIT = [];
    for (let x = 0; x < WIDTH; x++)
    {
        FIELDGRID_INIT.push([]);
        for (let y = 0; y < HEIGHT; y++)
        {
            FIELDGRID_INIT[x].push({
                fieldvalue: null,
                uncovered: false,
                isFlagged: false
            });
        }
    }
    fieldGrid = FIELDGRID_INIT;

    //Initialize layers to display

    const LAYERS = document.querySelectorAll("#playingField > div");
    LAYERS.forEach((layer, index) =>
    {
        layer.style.zIndex = index;
        writeIntoExistingTag(layer, (() =>
        {
            let txt = "";
            const NUM_FIELDS = WIDTH * HEIGHT;
            for (let i = 0; i < NUM_FIELDS; i++)
            {
                txt += writeIntoNewTag("div");
            }
            return txt;
        })());
    });

    //Initialize grid displays

    const PLAYING_FIELD_STYLE = document.querySelector("#playingFieldStyle");
    const BORDER_WIDTH = window.getComputedStyle(document.querySelector("#playingField")).getPropertyValue("border-width");
    const FIELD_SAMPLE = document.querySelector("#playingField > div > div");
    writeIntoExistingTag(PLAYING_FIELD_STYLE, `
    #playingField {
        width: calc(${WIDTH * FIELD_SAMPLE.offsetWidth}px + (${BORDER_WIDTH} * 2));
        height: calc(${HEIGHT * FIELD_SAMPLE.offsetWidth}px + (${BORDER_WIDTH} * 2));
    }

    #playingField > div {
        grid-template-columns: repeat(${WIDTH}, 1fr);
    }`);

    //Initialize event for clicking fields

    coverFields = document.querySelectorAll("#covers > div");
    overlayFields = document.querySelectorAll("#overlay > div");
    overlayFields.forEach((overlayField, index) =>
    {
        const COORDS = indexToCoords(index);
        overlayField.addEventListener("click", () =>
        {
            if (gameOver)
            {
                return;
            }
            clickedField(COORDS.x, COORDS.y);
        });
        {
            overlayField.addEventListener("contextmenu", rightClickEvent =>
            {
                rightClickEvent.preventDefault();
                if (gameOver)
                {
                    return;
                }
                if (!fieldGrid[COORDS.x][COORDS.y].uncovered)
                {
                    if (!fieldGrid[COORDS.x][COORDS.y].isFlagged)
                    {
                        coverFields[index].classList.add("flagged");
                        writeIntoExistingTag(coverFields[index], "&#x2691;");
                    }
                    else
                    {
                        coverFields[index].classList.remove("flagged");
                        writeIntoExistingTag(coverFields[index], "");
                    }
                    fieldGrid[COORDS.x][COORDS.y].isFlagged = !fieldGrid[COORDS.x][COORDS.y].isFlagged;
                }
            });
        }
    });

    //Initialize rest of the values

    valueFields = document.querySelectorAll("#valueFields > div");

    numFieldsLeft = WIDTH * HEIGHT - 1;
    numBombsToBePut = BOMB_COUNT;
    numFieldsNotUncovered = WIDTH * HEIGHT - BOMB_COUNT;
    gameOver = false;
});

function runForEntireGrid(delegate)
{
    for (let x = 0; x < WIDTH; x++)
    {
        for (let y = 0; y < HEIGHT; y++)
        {
            delegate(x, y);
        }
    }
}

function runForAdjacentFields(xCoord, yCoord, delegate)
{
    const X_LIMIT = xCoord + 1;
    for (let x = xCoord - 1; x <= X_LIMIT; x++)
    {
        const Y_LIMIT = yCoord + 1;
        for (let y = yCoord - 1; y <= Y_LIMIT; y++)
        {
            if (coordsAreInbound(x, y) && !(x === xCoord && y === yCoord))
            {
                delegate(x, y);
            }
        }
    }
}

function coordsAreInbound(x, y)
{
    return x >= 0 && x < WIDTH && y >= 0 && y < HEIGHT;
}

function indexToCoords(index)
{
    return {
        x: index % WIDTH,
        y: Math.floor(index / WIDTH)
    };
}

function coordsToIndex(x, y)
{
    return x + y * WIDTH;
}

function uncoverByCoords(xCoord, yCoord)
{
    if (!fieldGrid[xCoord][yCoord].isFlagged && !fieldGrid[xCoord][yCoord].uncovered)
    {
        if (isEmptyField(xCoord, yCoord))
        {
            if (--numFieldsNotUncovered === 0)
            {
                gameOver = true;
            }
            coverFields[coordsToIndex(xCoord, yCoord)].classList.add("hiddenField");
            fieldGrid[xCoord][yCoord].uncovered = true;
            if (fieldGrid[xCoord][yCoord].fieldValue === 0)
            {
                runForAdjacentFields(xCoord, yCoord, (x, y) =>
                {
                    if (!fieldGrid[x][y].uncovered)
                    {
                        uncoverByCoords(x, y);
                    }
                });
            }
        }
        else
        {
            gameOver = true;
            runForEntireGrid((x, y) =>
            {
                if (!isEmptyField(x, y))
                {
                    coverFields[coordsToIndex(x, y)].classList.add("hiddenField");
                }
            });
        }
    }
}

function firstUncoverInitializer(starterX, starterY)
{
    //Place bombs

    runForEntireGrid((x, y) =>
    {
        let fieldValue = 0;
        if (Math.random() < numBombsToBePut / numFieldsLeft-- && !(x === starterX && y === starterY))
        {
            fieldValue = -1;
            numBombsToBePut--;
        }
        fieldGrid[x][y].fieldValue = fieldValue;
    });

    //Increase field value around bombs

    runForEntireGrid((xCoord, yCoord) =>
    {
        if (!isEmptyField(xCoord, yCoord))
        {
            runForAdjacentFields(xCoord, yCoord, (x, y) =>
            {
                if (isEmptyField(x, y))
                {
                    fieldGrid[x][y].fieldValue++;
                }
            });
        }
    });

    //Apply coloring to the numbers and display bombs

    runForEntireGrid((x, y) =>
    {
        if (isEmptyField(x, y))
        {
            if (fieldGrid[x][y].fieldValue > 0)
            {
                const FIELD_INDEX = coordsToIndex(x, y);
                writeIntoExistingTag(valueFields[FIELD_INDEX], fieldGrid[x][y].fieldValue);
                valueFields[FIELD_INDEX].classList.add(NUMBER_COLOR_CLASSES[fieldGrid[x][y].fieldValue - 1]);
            }
        }
        else
        {
            const FIELD_INDEX = coordsToIndex(x, y);
            writeIntoExistingTag(valueFields[FIELD_INDEX], "&#x2600;");
            valueFields[FIELD_INDEX].classList.add("bomb");
        }
    });

    //Set up the "clickedField" method to try to uncover a field from now on

    clickedField = (clickedX, clickedY) =>
    {
        if (fieldGrid[clickedX][clickedY].uncovered)
        {
            if (fieldGrid[clickedX][clickedY].fieldValue > 0)
            {
                let numFlagsAdjacent = 0;
                runForAdjacentFields(clickedX, clickedY, (x, y) =>
                {
                    if (fieldGrid[x][y].isFlagged)
                    {
                        numFlagsAdjacent++;
                    }
                });
                if (fieldGrid[clickedX][clickedY].fieldValue === numFlagsAdjacent)
                {
                    runForAdjacentFields(clickedX, clickedY, (x, y) => uncoverByCoords(x, y));
                }
            }
        }
        else
        {
            uncoverByCoords(clickedX, clickedY);
        }
    };

    //Uncover the first field

    uncoverByCoords(starterX, starterY);
}

function isEmptyField(x, y)
{
    return fieldGrid[x][y].fieldValue >= 0;
}

function writeIntoExistingTag(parentTag, content)
{
    parentTag.innerHTML = content;
}

function writeToExistingTag(parentTag, content)
{
    parentTag.innerHTML += content;
}

function writeIntoNewTag(tag, parameters = null, content = "")
{
    return `<${tag}${parameters ? " " + parameters : ""}>${content}</${tag}>`;
}
