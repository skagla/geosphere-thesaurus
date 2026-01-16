const gbaURI = {
    struct: '-10-11-12-13-14-15-16-17-18-19-2-20-21-22-23-24-25-26-27-28-29-3-30-31-32-33-338-34-340-343-345-346-348-349-35-350-352-359-36-361-366-367-37-370-371-373-375-376-377-378-38-385-386-387-388-389-39-390-391-392-393-394-395-396-397-398-399-4-40-400-401-402-405-406-407-408-41-412-413-414-415-417-42-420-421-422-425-429-43-430-431-436-437-438-439-44-440-441-442-443-444-445-446-447-448-449-45-450-451-452-453-454-455-456-457-458-46-47-48-49-5-50-51-52-53-54-55-56-57-6-60-67-7-8-9-',
    geomorph: '-116-117-118-264-288-290-292-295-296-297-298-299-300-301-302-304-305-306-307-308-309-310-311-312-313-314-315-316-317-318-319-320-321-322-323-324-325-326-327-328-329-330-331-346-347-348-349-350-351-352-353-363-365-366-367-375-377-969-970-971-972-973-974-975-976-977-978-979-980-981-982-983-',
    faultc: '-208-30-65-66-28-352-63-62-64-67-',
    tectc: '-17-3-5-14-15-344-4-337-338-339-13-341-8-11-12-16-9-6-10-340-7-336-',
    geolunitc: '-197-202-204-208-206-200-210-199-205-209-203-201-211-'
};

function rewriteOldURI(uri) {
    if (uri.split('/')[5] != undefined) {
        let thesNumStr = '-' + uri.split('/')[5] + '-';
        switch (uri.split('/')[4]) {
            case 'geolunit':
                if (gbaURI.geomorph.indexOf(thesNumStr) > -1) {
                    uri = uri.replace('geolunit', 'geomorph');   
                } else if (gbaURI.geolunitc.indexOf(thesNumStr) > -1) {
                    uri = uri.replace('geolunit', 'geolunit-c');   
                } 
                break;
            case 'fault':
                if (gbaURI.struct.indexOf(thesNumStr) > -1) {
                    uri = uri.replace('fault', 'struct');   
                } else if (gbaURI.faultc.indexOf(thesNumStr) > -1) {
                    uri = uri.replace('fault', 'fault-c');   
                } 
                break;
            case 'tect':
                if (gbaURI.tectc.indexOf(thesNumStr) > -1) {
                    uri = uri.replace('tect', 'tect-c');   
                }
                break;
            default:
                break;
        }
    }
    //console.log('rewriteOldURI', uri);
    return uri;
}   

// page building&handling
"use strict";
var page = {
    BASE: location.protocol + '//' + location.host + location.pathname,
    urlParams: new URLSearchParams(window.location.search),
    isEmbedded: false,
    hideOnEmbed: ["#search_widget", "#navbarToggler", "#navbarResponsive", "#proj_desc", "#other_desc", "#pageFooter", "#navBar"],
    uriParameter: null,

    // called on page loaded
    init: function () {
        let USER_LANG = (navigator.language || navigator.language).substring(0, 2);
        $('#appsCard').toggle();
        if (this.urlParams.has('lang')) {
            USER_LANG = this.urlParams.get('lang');
        }

        if (USER_LANG !== 'de') {
            USER_LANG = 'en';
            $('#lang').text('EN');
        } else {
            $('#lang').text('DE');
        }
        lang.load(USER_LANG);

        this.setNavbarFooter();
        search.insertSearchCard(); //inserts search widget only
        let urlParams = this.urlParams;
        let startup = () => {
            let projects = config.projects;
            search.initProjects(projects);

            if (urlParams.has('search')) { //need lang parameter only for sparql requests
                search.insertSearch(decodeURI(urlParams.get('search')));
                this.insertProjCards(); //quick access cards, plus extended project comments from sparql
            } else if (urlParams.has('info')) {
                this.insertInfo(decodeURI(urlParams.get('info')));
                this.insertProjCards(); //quick access cards, plus extended project comments from sparql
            } else if (urlParams.has('list')) {
                $('#pageContent').empty();
                let uri = '§';
                let label = '§';
                if (urlParams.has('uri')) {
                    uri = decodeURI(urlParams.get('uri').replace(/["';><]/gi, '')); //avoid injection
                    this.uriParameter = uri;
                    label = decodeURI(urlParams.get('list').replace(/["';><]/gi, '')); //avoid injection
                }
                search.insertSparql(uri, label);
                this.insertProjCards(); //quick access cards, plus extended project comments from sparql
            } else if (urlParams.has('uri')) {
                let uri = config.checkUri(decodeURI(urlParams.get('uri').replace(/["';><]/gi, ''))); //avoid injection
                if (urlParams.get('uri').indexOf('geolba') > 0) {uri = rewriteOldURI(uri);}
                this.uriParameter = uri; 
                $('#pageContent').empty();
                let projectId = ws.getProject(uri);
                let item = config.projectConfiguration[projectId];
                this.initApps(uri, item);
                detail.details(uri);
                this.insertSideCard_projectInfo(item);
            } else {
                this.insertPageDesc(); //general intro
                this.insertComments('proj_desc', projects); //project desc from js ,insert before ProjCards!
                //this.insertComments('other_desc', [lang.DESC_INSPIRE, lang.DESC_LINKEDDATA]);
                this.insertProjCards(); //quick access cards, plus extended project comments from sparql
                //this.insertVideo(); //screen cast youtube
            }
            document.documentElement.setAttribute('lang', USER_LANG);

            this.updateSharingUrl($('#fbShare'));
            this.updateSharingUrl($('#twShare'));
            this.updateSharingUrl($('#liShare'));

            this.isEmbedded = urlParams.has('embedded');
            if (this.isEmbedded || ((screen.width < 1000) && (window.location.search == null || window.location.search == "" || urlParams.has('search')))) {
                var r = $("#rightSidebar");
                r.detach();
                if (!this.isEmbedded)
                    r.prependTo("#contentRow1");
                r.removeClass("col-lg-4");
                r.addClass("col-lg-8");
                $("#appsCard").css('visibility', 'collapse');
                $("#proj_links").css('display', 'none');
                if (!this.isEmbedded)
                    $("#search_widget").css('visibility', 'inherit');
                else {
                    page.hideOnEmbed.forEach(function (s) {
                        $(s).css('visibility', 'collapse');
                    });
                    $("a:not([target])").attr("target", "_blank");
                }
            }
        };
        if (urlParams.has('uri') || urlParams.has('search')) {
            config.init(true, USER_LANG).then(startup);
        }
        else {
            config.init(true, USER_LANG).then(startup);
        }
    },
    updateSharingUrl: function (e) {
        var v = encodeURIComponent(this.uriParameter != null ? this.uriParameter : window.location.href);
        var s = e.attr("href").replace("wwwgeolbanet", v).replace("wwwgeolbanet", v);
        e.attr("href", s);
    },
    updateSharingTexts: function (title) {
        this.updateSharingText($('#fbShare'), title);
        this.updateSharingText($('#twShare'), title);
        this.updateSharingText($('#liShare'), title);
    },
    updateSharingText: function (e, title) {
        var v = encodeURIComponent(title);
        var s = e.attr("href").replace("GBA%20Thesaurus", v).replace("GBA%20Thesaurus", v);
        e.attr("href", s);
    },
    setLang: function (lang) {
        if (location.href.indexOf('lang=') != -1) {
            if (lang == 'de') {
                location.replace(location.href.replace('lang=en', 'lang=de'));
            } else {
                location.replace(location.href.replace('lang=de', 'lang=en'));
            }
        } else if (location.href.indexOf('?') != -1) {
            location.replace(location.href + ('&lang=') + lang);
        } else {
            location.replace(location.href + '?lang=' + lang);
        }
        //console.log(location.href);
    },


    openParaLink: function (queryString) { //zB 'info=disclaimer'
        window.open(this.BASE + '?' + queryString + '&lang=' + lang.ID, '_self', '', 'false');
    },
    toggleRead: function (divBtn, divTxt, text) {
        let txt = $('#' + divTxt).is(':visible') ? '<span class="fa fa-caret-down"></span> <em>' + text + ' ..</em>' : '<span class="fa fa-caret-up"></span> <em>' + text + ' ..</em>';
        $('#' + divBtn).html(txt);
        $('#' + divTxt).slideToggle();
    },

    openFeedBack: function () {
        let email = 'thesaurus@geologie.ac.at';
        let subject = 'Anfrage';
        let body = '';
        if ($('#uri').length > 0) {
            body = 'URI: ' + $('#uri').text();
        }
        if ($('.altLabel').length > 0) {
            subject = $('.altLabel').html().replace(/<span class="lang">/g, '[').replace(/<\/span>/g, '] ').replace(/<li>/g, '').replace(/<\/li>/g, '').replace(/  /g, '');
        }
        let mailto_link = 'mailto:' + email + '?subject=' + subject + '&body=' + body;
        window.location.href = mailto_link;
    },

    insertSideCard_projectInfo: function (project) {
        if (project) {
            $('#proj_links').append(`<div class="card border-info mb-3">
                                <h4 class="card-header">${project.name} (${lang.TOPIC})</h4>
                                <div id="${project.id}Card" class="card-body">${project.desc}</div>
                            </div>`);
        }
    },

    insertInfo: function (topic) {
        var div = $('#page_desc');
        div.empty().append('<br>' + lang['DESC_' + topic.toUpperCase()]);
    },

    setNavbarFooter: function () {
        $('#LABEL_CONTACT').html(lang.LABEL_CONTACT);
        $('#contact').html(lang.LABEL_CONTACT);
        $('#license').html(lang.LABEL_LICENSE);
        $('#disclaimer').html(lang.LABEL_DISCLAIMER);
        $('#IMG_GBALOGO').attr('src', 'img/' + lang.IMG_GBALOGO);
    },
    insertProjCards: function () {
        var div = $('#proj_links');

        var query = `
                            PREFIX dcterms:<http://purl.org/dc/terms/> 
                            PREFIX skos:<http://www.w3.org/2004/02/skos/core#> 
                            SELECT ?g ?cL (COALESCE(?cD, "") AS ?desc) (COUNT(?n) AS ?count) (GROUP_CONCAT(DISTINCT ?L; separator = "|") as ?topConcepts)
                            @@from
                            WHERE { 
                            graph ?g {
                                ?c a skos:ConceptScheme; dcterms:title ?cL
                            . FILTER(lang(?cL)="${lang.ID}") . 
                            ?c skos:hasTopConcept ?tc . ?tc skos:prefLabel ?tcL . FILTER(lang(?tcL)="${lang.ID}") . 
                            ?tc skos:narrower* ?n 
                            BIND(CONCAT(STR(?tc),"$",STR(?tcL)) AS ?L) 
                            OPTIONAL {?c dcterms:description ?cD . FILTER(lang(?cD)="${lang.ID}")} 
                            @@filter
                            }
                            } 
                            GROUP BY ?g ?cL ?cD ORDER BY ?cL`;

        let from = "";
        for (let project of config.projects) {
            if (project.from)
                from += " " + project.from.replace("FROM", "FROM NAMED");
        }
        query = query.replace('@@from', "");
        ws.projectJson(null, query, "c", jsonData => {
            for (let project of config.projects) {
                if (!project.from)
                    continue;
                let projectId = project.id;
                let projectName = project.name;
                let projectDesc = project.desc;
                let projectUri = project.uri;
                div.append('<div class="card my-4"><h4 class="card-header">' + projectName +
                    '</h4><div id="' + projectId + 'Card" class="card-body"></div></div>');

                const cardDiv = $('#' + projectId + 'Card');
                const commentDiv = $('#' + projectId + 'Comment');

                commentDiv.append(`
                            <br>
                            <div style="cursor: pointer;" id="${projectId}rmBtn"
                            onclick="javascript: page.toggleRead(\'${projectId}rmBtn\', \'${projectId}ReadMore\', \'read more\');"
                            class="text-muted">
                                <span class="fa fa-caret-down"></span> <em>read more ..</em>
                            </div>
                            <div style="display:none;" id="${projectId}ReadMore">
                                <br>
                            </div>`);

                const readMoreDiv = $('#' + projectId + 'ReadMore');

                let items = jsonData.results.bindings.filter((s) => {
                    let f = s.g.value == projectUri;
                    return f;
                });
                for (let a of items) {
                    //console.log(a.topConcepts.value);
                    cardDiv.append('<strong style="color:#006666;">' + a.cL.value + '</strong>' + ': <a href="' + page.BASE + '?uri=' +
                        a.topConcepts.value.split('$').join('&lang=' + lang.ID + '">').split('|').join('</a>, <a href="' + page.BASE + '?uri=') + '</a><br>');
                    //add concept schemes + topConcepts to project descriptions
                    readMoreDiv.append('<h4>' + a.cL.value + ' (' + a.count.value +
                        '):</h4><a href="' + page.BASE + '?uri=' + a.topConcepts.value.split('$').join('&lang=' + lang.ID + '">').split('|').join('</a>, <a href="' +
                            page.BASE + '?uri=') + '</a><br>' + a.desc.value + '<br><br>');
                }

                readMoreDiv.append(`
                        <p class="">
                            <button type="button" class="btn btn-outline-info btn-sm" onclick="location.href='rdf/${projectId}.rdf'">
                                RDF/XML download
                            </button>
                            <button type="button" class="btn btn-outline-info btn-sm" onclick="location.href='bibl_res.html?proj=${projectId}';">
                                ${lang.LABEL_BIBLREF}
                            </button>
                        </p>
                        <hr>`);
            }
        }); //ws.projectJson
    },

    insertComments: function (divID, projects) {
        var div = $('#' + divID);
        div.empty();
        for (let desc of projects) {
            if (!desc.image) desc.image = 'profil.png';
            div.append(`
                                                <div class="media mb-4">
                                                    <img alt="${desc.name}" class="d-flex mr-3 rounded-circle" src="img/${desc.image}">
                                                    <div id="${desc.id}Comment" class="media-body">
                                                        <h4 class="mt-0">${desc.name}</h4>
                                                        ${desc.desc}
                                                    </div>
                                                </div>`);
        }
    },

    insertPageDesc: function () {
        $('#page_desc').append('<br><span style="font-size: 34px;">Thesaurus</span>')
            .append('<h3>' + lang.TITLE_THES_2 + '</h3><br>')
            .append('<p>' + lang.DESC_THESAURUS + '</p>');
    },

    initApps: function (uri, project) {
        $('#appsCard').toggle();
        $('#appsCard .card-header').html('<h4>' + lang.APPS + '</h4>');
        $('#appsBody1').append(page.getAppLink(uri, "network.html", "<br>Network<br>diagram", "Visual Network"));
        $('#appsBody1').append(page.getDiagramLink(uri, project));
    },
    getAppLink: function (uri, page, label, title) {
        return `<div class="apps">
                                            <span >
                                                <svg version="1.1" id="cluster" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="28px" height="28px" viewBox="0 0 88 88">
                                                    <path fill="#052E37" d="M25.243,68.226c-7.779-0.162-10.824,1.418-12.514,6.269
                                                    c-1.298,3.725-0.073,7.843,3.052,10.26c3.124,2.417,8.021,2.507,11.218,0.207c3.956-2.846,4.598-6.665,2.281-13.977
                                                    c2.695-3.676,5.439-7.419,7.67-10.462c4.344-0.346,7.912-0.63,10.76-0.856c2.77,2.229,5.328,4.29,7.639,6.15
                                                    c-3.086,9.265-1.674,15.109,4.174,18.846c5.004,3.198,11.908,2.506,16.154-1.619c4.309-4.186,5.209-10.888,2.154-16.039
                                                    c-3.627-6.117-9.424-7.57-18.604-4.8c-2.486-2.344-4.881-4.601-6.598-6.221c0-4.854,0-8.901,0-13.041
                                                    c3.43-3.57,7.107-7.399,10.752-11.193c9.363,4.032,16.313,2.72,21.049-3.901c4.033-5.643,3.449-13.757-1.357-18.86
                                                    C78.143,3.751,69.836,2.801,63.859,6.79c-6.689,4.463-8.117,11.536-4.303,21.188c-3.783,3.745-7.553,7.479-11.523,11.411
                                                    c-1.955-0.574-4.135-1.213-6.449-1.892c-1.358-5.275-2.673-10.38-3.913-15.195c4.617-5.517,5.502-9.582,3.164-13.413
                                                    c-2.165-3.548-6.295-5.263-10.355-4.3c-3.828,0.907-6.542,4.212-6.772,8.244c-0.319,5.573,1.616,7.891,9.164,10.797
                                                    c1.332,4.98,2.699,10.095,4.098,15.327c-1.748,1.625-3.408,3.168-5.104,4.745c-4.015-1.192-7.824-2.323-11.454-3.4
                                                    c-2.861-7.399-5.794-10.033-10.653-9.752c-4.045,0.234-7.7,3.273-8.632,7.178c-0.886,3.712,0.814,7.84,4.115,9.989
                                                    c4.029,2.622,7.786,1.88,13.602-2.779c3.861,1.141,7.828,2.312,11.364,3.354c1.129,3.27,2.087,6.046,3.097,8.969
                                                    C30.682,60.825,28.026,64.438,25.243,68.226z"/>
                                                </svg>
                                            </span>
                                            <a href="${page}?uri=${uri}&lang=${lang.ID}" title="${title}" class="card-link" target="_blank">
                                                ${label}
                                            </a>
                                        </div>`;
    },
    getDiagramLink: function (uri, project) {
        let icon;

        switch (project.diagram) {
            case 'tree':
                icon = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="28px" height="28px" viewBox="0 0 32 32" version="1.1">
                <g id="surface1">
                <path style=" stroke:none;fill-rule:nonzero;fill:rgb(0%,0%,0%);fill-opacity:1;" d="M 20.035156 2.332031 L 12.832031 2.332031 L 12.832031 12.832031 L 8.167969 12.832031 L 8.167969 10.5 L 1.167969 10.5 L 1.167969 17.5 L 8.167969 17.5 L 8.167969 15.167969 L 12.832031 15.167969 L 12.832031 25.667969 L 20.035156 25.667969 C 20.515625 27.027344 21.808594 28 23.332031 28 C 25.265625 28 26.832031 26.433594 26.832031 24.5 C 26.832031 22.566406 25.265625 21 23.332031 21 C 21.808594 21 20.515625 21.972656 20.035156 23.332031 L 15.167969 23.332031 L 15.167969 15.167969 L 20.035156 15.167969 C 20.515625 16.527344 21.808594 17.5 23.332031 17.5 C 25.265625 17.5 26.832031 15.933594 26.832031 14 C 26.832031 12.066406 25.265625 10.5 23.332031 10.5 C 21.808594 10.5 20.515625 11.472656 20.035156 12.832031 L 15.167969 12.832031 L 15.167969 4.667969 L 20.035156 4.667969 C 20.515625 6.027344 21.808594 7 23.332031 7 C 25.265625 7 26.832031 5.433594 26.832031 3.5 C 26.832031 1.566406 25.265625 0 23.332031 0 C 21.808594 0 20.515625 0.972656 20.035156 2.332031 Z M 20.035156 2.332031 "/>
                </g>
                </svg>`;
                break;
            case 'sunburst':
                icon = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="28px" height="28px" viewBox="0 0 32 32" version="1.1">
                <g id="surface1">
                <path style=" stroke:none;fill-rule:nonzero;fill:rgb(0%,0%,0%);fill-opacity:1;" d="M 15.105469 0.0429688 L 15.105469 8.960938 C 16.164062 9.195312 17.105469 9.75 17.808594 10.523438 L 25.535156 6.066406 C 23.207031 2.6875 19.433594 0.382812 15.105469 0.0429688 Z M 15.105469 0.0429688 "/>
                <path style=" stroke:none;fill-rule:nonzero;fill:rgb(0%,0%,0%);fill-opacity:1;" d="M 26.640625 7.976562 L 18.917969 12.4375 C 19.074219 12.929688 19.15625 13.457031 19.15625 14 C 19.15625 16.46875 17.421875 18.53125 15.105469 19.039062 L 15.105469 27.957031 C 22.320312 27.394531 28 21.359375 28 14 C 28 11.84375 27.511719 9.800781 26.640625 7.976562 Z M 26.640625 7.976562 "/>
                <path style=" stroke:none;fill-rule:nonzero;fill:rgb(0%,0%,0%);fill-opacity:1;" d="M 12.894531 8.960938 L 12.894531 0.0429688 C 5.679688 0.605469 0 6.640625 0 14 C 0 21.359375 5.679688 27.394531 12.894531 27.957031 L 12.894531 19.039062 C 10.578125 18.53125 8.84375 16.46875 8.84375 14 C 8.84375 11.53125 10.578125 9.46875 12.894531 8.960938 Z M 12.894531 8.960938 "/>
                </g>
                </svg>`;
                break;
            default: // circles etc
                icon = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="28px" height="28px" viewBox="0 0 32 32" version="1.1">
                <g id="surface1">
                <path style=" stroke:none;fill-rule:nonzero;fill:rgb(0%,0%,0%);fill-opacity:1;" d="M 25.804688 14.15625 C 25.816406 14.066406 25.816406 13.972656 25.804688 13.882812 C 25.75 7.449219 20.550781 2.25 14.117188 2.195312 C 14.074219 2.191406 14.027344 2.1875 13.984375 2.1875 L 13.980469 2.1875 C 13.9375 2.1875 13.890625 2.191406 13.84375 2.195312 C 7.441406 2.269531 2.269531 7.441406 2.195312 13.84375 C 2.191406 13.890625 2.1875 13.9375 2.1875 13.984375 C 2.1875 14.027344 2.191406 14.070312 2.195312 14.113281 C 2.25 20.550781 7.453125 25.753906 13.886719 25.804688 C 13.929688 25.808594 13.972656 25.8125 14.015625 25.8125 L 14.019531 25.8125 C 14.0625 25.8125 14.109375 25.808594 14.15625 25.804688 C 20.558594 25.730469 25.730469 20.558594 25.804688 14.15625 Z M 7.503906 7.503906 C 8.871094 6.132812 10.640625 5.230469 12.554688 4.933594 C 11.925781 8.851562 8.851562 11.925781 4.933594 12.554688 C 5.230469 10.640625 6.132812 8.871094 7.503906 7.503906 Z M 4.898438 15.210938 C 7.523438 14.898438 9.96875 13.710938 11.835938 11.835938 C 13.710938 9.96875 14.898438 7.523438 15.210938 4.898438 C 19.324219 5.4375 22.5625 8.675781 23.101562 12.789062 C 17.699219 13.445312 13.445312 17.699219 12.789062 23.101562 C 8.675781 22.5625 5.4375 19.324219 4.898438 15.210938 Z M 15.445312 23.066406 C 16.074219 19.148438 19.148438 16.074219 23.066406 15.445312 C 22.449219 19.371094 19.371094 22.449219 15.445312 23.066406 Z M 15.445312 23.066406 "/>
                </g>
                </svg>`;
        }

        return `
<div class="apps" id="appDiagram" style="display:none;">
<span>
    ${icon}
</span>
<a href="diagram.html?uri=${uri}&lang=${lang.ID}" title="Relations Diagram" class="card-link" target="_blank">
    <br>Hierarchy<br>diagram</br>
</a>
</div>`;
    }
};
