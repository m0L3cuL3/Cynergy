const iframe = document.getElementsByTagName("iframe")[0];
var editors = {};
editors.html = CodeMirror($(".editor .html")[0], {
    lineNumbers: true,
    lineWrapping: true,
    autofocus: true,
    mode: "htmlmixed"
});
editors.css = CodeMirror($(".editor .css")[0], {
    lineNumbers: true,
    lineWrapping: true,
    mode: "css"
});
editors.js = CodeMirror($(".editor .js")[0], {
    lineNumbers: true,
    lineWrapping: true,
    mode: "javascript"
});

function getExportedValue() {
    var content = `
    <!DOCTYPE html>
    <style>${editors.css.getValue()}</style>
    ${editors.html.getValue()}
    <script>${editors.js.getValue()}</script>`;
    return content;
}

function updateIframeValue() {
    iframe.srcdoc = getExportedValue();
}

editors.html.on('change', function(instance, changeObj) {
    updateIframeValue();
});
editors.css.on('change', function(instance, changeObj) {
    updateIframeValue();
});
editors.js.on('change', function(instance, changeObj) {
    updateIframeValue();
});

var demoHTML = `\
<h1>Hello, World!</h1>`;
var demoCSS = `\
@import url('https://fonts.googleapis.com/css?family=Roboto:400,500|Poppins:500');
body {
  text-align: center;
  font-family: 'Roboto';
}

h1 {
  font: 500 2em 'Poppins';
}`;

var demoJS = ``;

editors.html.setValue(demoHTML);
editors.css.setValue(demoCSS);
editors.js.setValue(demoJS);

function toggleMenu() {
    var drop = document.getElementsByClassName("drop")[0];
    if (drop.style.display == "block") {
        drop.style.display = "none";
    } else {
        drop.style.display = "block";
    }
}

function togglePreview() {
    var iframe = document.getElementsByTagName("iframe")[0];
    var drop = document.getElementsByClassName("drop")[0];
    if (iframe.style.display == "block") {
        iframe.style.display = "none";
        drop.children[1].innerHTML = "Enable live preview";
    } else {
        iframe.style.display = "block";
        drop.children[1].innerHTML = "Disable live preview";
    }
    $(".editor").toggleClass("noiframe");
}

function toggleThemePanel() {
    var menu = document.getElementById("panel");
    if (menu.style.display == "block") {
        menu.style.display = "none";
    } else {
        menu.style.display = "block";
    }
    //$(".editor").toggle();
}

function changeTheme(value) {
    document.querySelector("*[aria-rel=xor-editor-styling]").outerHTML = "";
    document.querySelector("*[aria-rel=xor-syntax-styling]").outerHTML = "";
    var new_editor_style = document.createElement("link");
    var new_syntax_style = document.createElement("link");
    new_editor_style.rel = "stylesheet";
    new_syntax_style.rel = "stylesheet";
    new_editor_style.setAttribute("aria-rel", "xor-editor-styling");
    new_syntax_style.setAttribute("aria-rel", "xor-syntax-styling");
    new_editor_style.href = "assets/codemirror-" + value + ".css";
    new_syntax_style.href = "assets/syntax-" + value + ".css";
    document.getElementsByTagName("head")[0].appendChild(new_editor_style);
    document.getElementsByTagName("head")[0].appendChild(new_syntax_style);
}

function changeActiveEditor(activeEditor, tab) {
    $(".tab").removeClass("active");
    $(tab).addClass("active");
    $(`.editors .e`).css("display", "none");
    $(`.editors .e.${activeEditor}`).css("display", "block");
    editors[activeEditor].focus();
}

$(".tab").click(function() {
    var e = $(this).attr('aria-editor');
    changeActiveEditor(e, this);
});
changeActiveEditor("html", $(".tab.active"));

// Commands
$(window).keydown(function (e){
    if ((e.metaKey || e.ctrlKey) && e.keyCode == 83) { /*ctrl+s or command+s*/
        saveFile();
        e.preventDefault();
        return false;
    }
});
$(window).keydown(function (e){
    if ((e.metaKey || e.ctrlKey) && e.keyCode == 80) { /*ctrl+p or command+p*/
        togglePreview();
        e.preventDefault();
        return false;
    }
});
