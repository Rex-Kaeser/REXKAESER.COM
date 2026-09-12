
void function (script) {
    //const { searchParams } = new URL(script.src);
    var grade = script.getAttribute("grade").toUpperCase();
    var gradeColor = "blue";
    if (grade[0] == "B"){
        gradeColor = "green";
    }
    if (grade[0] == "C"){
        gradeColor = "yellow";
    }

    var classTitle = script.getAttribute("title");
    var classDesc = script.getAttribute("description");
    console.log(script.innerHTML.toString());

    const fetchLocation = "./public/html/util/classTile.html";
    fetch(fetchLocation).then(r => r.text()).then(content => {
        if (grade == "P"){
            content = content.replace("%tile_class%", "analog-box analog-green");
            content = content.replace("%hide_grade%", "hidden");
        }
        else if (grade == "NS"){
            content = content.replace("%tile_class%", "analog-box analog-grey");
            content = content.replace("%hide_grade%", "hidden");
        }
        else if (grade == "IP"){
            content = content.replace("%tile_class%", "analog-box analog-yellow");
            content = content.replace("%hide_grade%", "hidden");
        }else{
            content = content.replace("%tile_class%", "analog-box analog-green");
            
        }
        content = content.replace("%grade_text%", grade);
        content = content.replace("%grade_color%", gradeColor);

        content = content.replace("%class_title%", classTitle);

        content = content.replace("%class_description%", classDesc);
        
        content = content.replace("%hide_grade%", "");

        var parentNode = script.parentNode;
        script.outerHTML = content;
    });

}(document.currentScript);