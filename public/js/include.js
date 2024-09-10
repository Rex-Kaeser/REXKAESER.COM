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

void function (script) {
    //const { searchParams } = new URL(script.src);
    var fetchLocation = script.getAttribute("fetch")
    fetch(fetchLocation).then(r => r.text()).then(content => {
        if (script.hasAttribute("rep")) {
            content = content.replace(script.getAttribute("rep"), script.innerHTML)
        }
        var title = ""
        if (script.hasAttribute("title")){
            title = script.getAttribute("title")
        }
        content = content.replace("%title%", title)
        var parentNode = script.parentNode;
        script.outerHTML = content;
        RevalidateScripts(parentNode);
    });

}(document.currentScript);