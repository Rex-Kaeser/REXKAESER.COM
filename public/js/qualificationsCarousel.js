const screensNames = ["Education", "Experience", "Certifications & Awards", "Skills", "Employment", "Interests & Community Service"]
const screensHashNames = ["education", "experience", "certs_awards", "skills", "employment", "intrests_service"]
const screensPaths = ["./public/html/qualifications/education.html", "./public/html/qualifications/experience.html", "./public/html/qualifications/certandawards.html", "./public/html/qualifications/skills.html", "./public/html/qualifications/employment.html",  "./public/html/qualifications/interestsandservice.html"]

var screen = 0;

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

function loadScreen(){
    document.getElementById("qualifications-title").innerHTML = screensNames[screen];
    document.getElementById("qualifications-content").innerHTML = "Loading..."
    LoadInclude(document.getElementById("qualifications-content"), screensPaths[screen]);
}
function qualPrev(){
    screen --;
    SetHashToScreen();
    //loadScreen();
}

function qualNext(){
    
    screen++;
    SetHashToScreen();
    //loadScreen();
}

function SetHashToScreen(){
    if (screen < 0){
        screen = screensNames.length - 1;
    }
    if (screen >= screensNames.length){
        screen = 0;
    }
    window.location.hash = screensHashNames[screen];
}


function updateHashQualification(){
    var hash = window.location.hash.replace("#", "");
    if (hash.length < 1){
        SetHashToScreen();
        return;
    }
    for (var i = 0; i < screensHashNames.length; i++){
        if (hash.toLowerCase() == screensHashNames[i].toLowerCase()){
            screen = i;
            break;
        }
    }
    loadScreen();
}

window.addEventListener('hashchange', () => {
    updateHashQualification();
});  

updateHashQualification();

