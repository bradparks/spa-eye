define([
    "firebug/firebug",
    "firebug/lib/object",
    "firebug/lib/trace",
    "firebug/lib/locale",
    "firebug/lib/domplate",
    "firebug/lib/dom",
    "firebug/lib/css",
    "firebug/lib/events",
    "firebug/chrome/reps",

    "spa_eye/lib/require/underscore",
    "spa_eye/dom/domReps",
    "spa_eye/panels/basePanel"
],
    function (Firebug, Obj, FBTrace, Locale, Domplate, Dom, Css, Events, FirebugReps, _, DOMReps, BasePanel) {

        var logPanel = Firebug.logPanel = BasePanel.extend({
            name:"spa_eye:logs",
            title:Locale.$STR("spa_eye.logs.title"),
            tooltip:Locale.$STR("spa_eye.logs.tooltip"),

            parentPanel:"spa_eye",
            tag:DOMReps.DirTablePlate.tag,
            order:2,

            onIntrospectionError:function () {
                this.show();
            },

            show:function () {
                var spa_eyeObj = this.context.spa_eyeObj;
                var result = spa_eyeObj._spaHook.errors();
                if (result.length) {
                    this.title = Locale.$STR("spa_eye.logs.title") + " (" + result.length + ")";

                    //clunky + cache : https://groups.google.com/forum/#!topic/firebug/SVPiRHku_IU
                    var panelBar = Firebug.chrome.$("fbPanelBar2");
                    var tab = panelBar.getTab(this.name);
                    tab.setAttribute("label", this.title);
                    //end clunky

                    this.tag.replace({object:result}, this.panelNode);
                } else
                    FirebugReps.Warning.tag.replace({object:"spa_eye.logs.noerror"}, this.panelNode);
            }


        });

        return Firebug.logPanel;

    });
