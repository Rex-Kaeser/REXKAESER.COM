function RevalidateScripts(node) 
{
    var scripts = Array.prototype.slice.call(node.getElementsByTagName("script"), 0)
    for (var v = 0; v < scripts.length; v++){
        var scriptNode = scripts[v]
        var parentNode = scriptNode.parentNode;
        parentNode.removeChild(scriptNode)

        var newScriptNode = document.createElement("script")
        for (var k = 0; k < scriptNode.attributes.length; k++) {
            var attrib = scriptNode.attributes[k];
            newScriptNode.setAttribute(attrib.name, attrib.value)
        }
        parentNode.appendChild(newScriptNode)
    }
}

function LoadInclude(node, path){
    fetch(path).then(r => r.text()).then(content => {
        node.innerHTML = content;
        RevalidateScripts(node);
    });
}

function closePopup(){
    setPopup("");
}

function updateHashPopup(){
    var hash = window.location.hash.replace("#", "");
    if (hash.length < 1){
        document.getElementById('popup-div').classList.add('hidden');
    }
    loadPop(hash);
}

const queryPopupKey = "pop";

function loadPop(hash){
    if (hash.length > 0){
        var path = "./public/popups/" + hash + ".txt";
        fetch(path).then(r => r.text()).then(content => {
            let lines = content.split('\n');
            if (lines.length == 2){
                var name = lines[0]
                var path = lines[1];
                console.log(lines);
                openPopup(name, path);
            }
        });
    }else{
        document.getElementById('popup-div').classList.add('hidden');
}
}
function updateQueryPopup(){
    const queryString = window.location.search; // Gets everything after ?
    const params = new URLSearchParams(queryString);

    // Check if a specific parameter exists
    if (params.has(queryPopupKey)) {
        loadPop(params.get(queryPopupKey));
    }else{
        loadPop("");
    }

    // Loop through all parameters
    for (const [key, value] of params.entries()) {
    console.log(`${key}: ${value}`);
    }
}
function setPopup(hash){
    //window.location.hash = hash;

    const url = new URL(window.location);
    url.searchParams.delete(queryPopupKey);
    if (hash.length > 0){
        url.searchParams.set(queryPopupKey, hash); // or .delete(key) to remove
    }

    const newUrl = url.pathname + url.search + window.location.hash;

    history.pushState({}, '', newUrl);

    window.dispatchEvent(new Event('queryChanged'));
}

function openPopup(name, path){
    document.getElementById('popup-title').innerHTML = name;
    document.getElementById('popup-div').classList.remove('hidden');
    document.getElementById('popup-content').innerHTML = "Loading..."
    LoadInclude(document.getElementById('popup-content'), path);
}

/*
window.addEventListener("hashchange", function() {
    updateHashPopup();
});  

updateHashPopup();
*/

window.addEventListener('queryChanged', () => {
    updateQueryPopup();
});

updateQueryPopup();


