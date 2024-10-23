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
    //document.getElementById('popup-div').classList.add('hidden');
    setPopup("");
}

function updateHashPopup(){
    var hash = window.location.hash.replace("#", "");
    if (hash.length < 1){
        document.getElementById('popup-div').classList.add('hidden');
    }
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
}

function setPopup(hash){
    window.location.hash = hash;
}

function openPopup(name, path){
    document.getElementById('popup-title').innerHTML = name;
    document.getElementById('popup-div').classList.remove('hidden');
    document.getElementById('popup-content').innerHTML = "Loading..."
    LoadInclude(document.getElementById('popup-content'), path);
}

window.addEventListener("hashchange", function() {
    updateHashPopup();
});  

updateHashPopup();

