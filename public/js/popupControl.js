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
    document.getElementById('popup-div').classList.add('hidden');
}

function openPopup(name, path){
    document.getElementById('popup-title').innerHTML = name;
    document.getElementById('popup-div').classList.remove('hidden');
    document.getElementById('popup-content').innerHTML = "Loading..."
    LoadInclude(document.getElementById('popup-content'), path);
}