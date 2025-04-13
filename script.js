
/**
 * 
 * @param {Element?} element
 */
function Initialize() {
    InitializeCommonHtml().then(() =>{
        CreateMenu();
        InitializeTerminal();
        CreateImageMaps(document);
        CreateCommonContents(document);
    });
}

async function InitializeCommonHtml(){
    const str = sessionStorage["commonHtml"];
    if (str){
        document.commonHtml = JSON.parse(str);
    }
    else{
        try{
            const response = await fetch("commonHtml.json");
            const text = await response.text();
            document.commonHtml = JSON.parse(text);
            sessionStorage["commonHtml"] = text;
        }
        catch{
            document.commonHtml = new Object();
        }
    }
}

function IsOnline() {
    return window.location.protocol !== "file:";
}

/**
 * 
 * @param {String} url 
 */
async function GetCachedHtml(url){
    /** @type{Object} */
    const common = document.commonHtml;
    /** @type{String} */
    const cache = common[url];
    if (cache){
        return cache;
    }
    else{
        const result = await fetch(url);
        const text = await result.text();
        if (IsOnline()){
            common[url] = text.replaceAll(/\r\n\s*/g, "");
        }
        sessionStorage["commonHtml"] = JSON.stringify(common);
        return text;
    }
}

async function CreateMenu(){
    const text = await GetCachedHtml("common/menu.html");
    const menu = document.createElement("div");
    menu.className = "menu";
    menu.innerHTML = text;
    menu.querySelectorAll("details").forEach((element) => {
        const id = element.id;
        if (id){
            if (window.sessionStorage[id] === "true"){
                element.open = true;
            }
            element.ontoggle = () => { window.sessionStorage[id] = element.open; };
        }
    });
    document.body.appendChild(menu);
}

function InitializeTerminal(){
    const div = document.getElementById("tab_terminal");
    if (div){
        const map = `1,  0, 25, 21, common/undo.html;
                    26,  0, 25, 21, common/redo.html;
                     1, 22, 60, 45, common/show_terminal.html;
                    61, 22,208, 23, terminal/hide.html;
                    61, 45,208, 22, terminal/show.html;
                   274, 22, 81, 45, terminal/console.html;
                   360, 22,114, 45, terminal/language.html;
                   479, 22, 83, 45, terminal/manual.html;
                   562, 22, 97, 45, terminal/update.html;`;
        div.className = "image-map";
        div.setAttribute("maps", map);
    }
}

/**
 * @param {Element} element
 */
function CreateCommonContents(element){
    element.querySelectorAll("div.common").forEach(e => e !== element && AddInnerHtml(e));
}

/**
 * 
 * @param {HTMLDivElement} element
 * @param {string} ifnone 
 */
function AddInnerHtml(element, ifnone){

    if (element){
        /** @type{Attr} */
        const attr = element.attributes["src"];
        const url = attr ? attr.value : ifnone;
        if (url){
            GetCachedHtml(url).then(text =>{
                element.innerHTML = text;
                CreateImageMaps(element);
                CreateCommonContents(element);
            });
        }
    }
}

/**
 * @typedef {Object} ImageMapChild
 * @prop {Number[]} rect
 * @prop {Number} scale
 * @prop {HTMLElement} button
 * @prop {HTMLInputElement?} checkbox
 * @prop {HTMLDivElement?} popup
 * @prop {bool} center
 */

/**
 * @typedef {Object} ImageMap
 * @prop {HTMLImageElement} img
 * @prop {Number} width
 * @prop {ImageMapChild[]} children
 */

/** @type {ImageMap[]} */
const observers = [];

/**
 * @param {Element} element
 */
function CreateImageMaps(element){
    element.querySelectorAll("div.image-map").forEach(e => observers.push(ProcessCreateImageMaps(e)));
    observers.width = 0;
    if (observers.length > 0){
        window.lastHeight = 0;
        window.addEventListener("resize", () => {
            if (observers.width !== window.innerWidth){
                observers.width = window.innerWidth;
                observers.forEach(e => UpdateImageMap(e));
                UpdateContentHeight();
            }
        });
    }
}

function UpdateContentHeight(){
    const content = document.querySelector("div.content");
    if (content){
        if (window.lastHeight < content.scrollHeight){
            window.lastHeight = content.scrollHeight;
            content.style.height = `${window.lastHeight}px`;
        }
    }
}

/**
 * @returns {String}
 */
function GetRandomName(){
    return Math.floor((Math.random() * 2147483647)).toString(16);
}

/**
 * @param {HTMLDivElement} element
 * @returns {ImageMap}
 */
function ProcessCreateImageMaps(element)
{
    const src = element.getAttribute("src");
    const img = document.createElement("img");
    img.className = "image-map";
    img.src = src;
    element.appendChild(img);
    const imgChildren = [];
    
    const maps = element.getAttribute("maps")
                        .splitWithoutSpace(";")
                        .map(s => s.splitWithoutSpace(","));
    maps.forEach(list => {
        /** @type {ImageMapChild} */
        const child = {rect: list.slice(0, 4).map(s => Number(s))};
        const href = list[4];
        const mode = list[5];
        if (mode === "link"){
            const button = document.createElement("a");
            button.className = "image-map-button";
            button.href = href;
            child.button = button;
            element.appendChild(button);
        }
        else{
            child.center = mode === "center";
            const checkboxId = `checkbox_${GetRandomName()}`;

            const button = document.createElement("label");
            button.className = "image-map-button";
            button.setAttribute("for", checkboxId);
            child.button = button;
            element.appendChild(button);

            const div = document.createElement("div");
            div.className = "popup";
            element.appendChild(div);
            
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.className = "popup-flag";
            checkbox.id = checkboxId;
            child.checkbox = checkbox;
            div.appendChild(checkbox);

            const background = document.createElement("label");
            background.className = "popup-background";
            background.setAttribute("for", checkboxId);
            div.appendChild(background);

            const frame = document.createElement("div");
            frame.className = "popup-frame";
            child.popup = frame;
            div.appendChild(frame);

            const popupContent = document.createElement("div");
            popupContent.className = "popup-content common";
            popupContent.setAttribute("src", href);
            frame.appendChild(popupContent);

            const closeButton = document.createElement("label");
            closeButton.className = "close-button";
            closeButton.setAttribute("for", checkboxId);
            closeButton.innerText = "×";
            frame.appendChild(closeButton);

            checkbox.onchange = () => OnCheckboxChanged(child);
        }

        imgChildren.push(child);
    });

    /** @type {ImageMap} */
    const ret = { img: img, width: 0, children: imgChildren };
    img.onload = () => UpdateImageMap(ret);
    return ret;
}

/**
 * @returns {Number}
 */
function CalcLimitX(){
    const content = document.querySelector("div.content");
    return content ? content.clientWidth - 8 : Infinity;
}

/**
 * @param {ImageMap} e 
 */
function UpdateImageMap(e){
    const width = e.img.clientWidth;
    if (e.width !== width){
        e.width = width;
        const scale = width / e.img.naturalWidth;
        const contentWidth = CalcLimitX();
        e.children.forEach(child => {
            child.scale = scale;
            const rect = child.rect;
            const x = rect[0] * scale;
            const y = rect[1] * scale;
            const w = rect[2] * scale;
            const h = rect[3] * scale;
            child.button.style = `left:${x}px; top:${y}px; width:${w}px; height:${h}px`;
            const popup = child.popup;
            if (popup){
                const py = y + h / (child.center ? 2 : 1);
                popup.style = `left:${CalcPopupContentX(popup, x, contentWidth)}px; top:${py}px`;
            }
        });
    }
}

/**
 * 
 * @param {ImageMapChild} child 
 */
function OnCheckboxChanged(child){
    if (child.checkbox.checked){
        UpdateContentHeight();
        const contentWidth = CalcLimitX();
        const x = child.rect[0] * child.scale;
        child.popup.style.left = `${CalcPopupContentX(child.popup, x, contentWidth)}px`;
    }
}

/**
 * 
 * @param {Element} popup 
 * @param {Number} buttonX 
 * @param {Number} limit
 * @returns {Number} 
 */
function CalcPopupContentX(popup, buttonX, limit){
    const pw = popup.clientWidth;
    let x = buttonX;
    if (x + pw > limit){
        x = limit - pw;
    }
    if (x < 0){
        x = 0;
    }
    return x;
}

/**
 * @param {string|RegExp} separator
 * @returns {string[]}
 */
String.prototype.splitWithoutSpace = function(separator){
    return this.split(separator)
               .map(s => s.replace(/\s*/, ""))
               .filter(s => s !== "");
}

Initialize();
