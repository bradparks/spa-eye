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
    "firebug/lib/dragdrop",

    "spa_eye/dom/section",
    "spa_eye/dom/modelReps",
    "spa_eye/dom/domReps",
    "spa_eye/panels/basePanel"
],
    function (Firebug, Obj, FBTrace, Locale, Domplate, Dom, Css, Events, FirebugReps, DragDrop, ChildSection, ModelReps, DOMReps, BasePanel) {

        var eventPanel = Firebug.eventPanel = BasePanel.extend({
            name:"spa_eye:event",
            title:Locale.$STR("spa_eye.event.title"),
            tooltip:Locale.$STR("spa_eye.event.tooltip"),

            parentPanel:"spa_eye",
            order:1,
            follows:['Model', 'Collection'],


            initialize:function () {
                this._super.apply(this, arguments);
                this.timeline.TIMELINE.replace({object:[]}, this.panelNode);
                this.timeline.RESIZER.append({}, this.panelNode);
                this.timeline.TABLE.append({}, this.panelNode);
                this.timeline.tag.append({sections:[], mainPanel:this.panelNode}, this.panelNode.lastChild);
                this.sequenceEditor = this.panelNode.firstChild.contentWindow;
                var self = this;
                this.panelNode.firstChild.onload = function () {
                    self.show();
                    var resizer = self.panelNode.querySelector(".spa_eye_resizer");
                    new DragDrop.Tracker(resizer, {
                        onDragStart:Obj.bind(self.onDragStart, self),
                        onDragOver:Obj.bind(self.onDragOver, self),
                        onDrop:Obj.bind(self.onDrop, self)
                    });
                }
            },

            onSelectedEntityChange:function (m) {
                this.show();
            },

            onTrackingDataCleared:function () {
                this.show();
            },

            onToggleHeader:function (section, panel) {

                if (panel === this.panelNode) {
                    var title = section.title;
                    var idx = 0;
                    if (title) {
                        var matches = title.split('=');
                        (matches.length === 2) && (idx = parseInt(matches[1]));
                    }
                    var data = section.data;
                    var cid = data[0] && data[0].cid;
                    var sequence = this.context.spa_eyeObj._spaHook.sequences()[cid];
                    this.plotData = sequence ? [sequence.flows[idx]] : [];
                    this.plotFlow(cid, idx);
                }

            },

            show:function () {
                var spa_eyeObj = this.context.spa_eyeObj;
                var selectedEntity = spa_eyeObj && spa_eyeObj.selectedEntity;
                var idx = 0;
                var id = undefined;
                if (selectedEntity && selectedEntity.cid) {
                    var sequence = this.context.spa_eyeObj._spaHook.sequences()[selectedEntity.cid];
                    this.sequenceData = (sequence && sequence.flows) ? sequence.flows : [];
                    idx = this.sequenceData.length - 1;
                    this.plotData = idx >= 0 ? [this.sequenceData[idx]] : [];
                    id = selectedEntity.cid;
                } else {
                    this.sequenceData = [];
                    this.plotData = []
                }
                this.plotFlow(id, idx);
                this.tabulateData();

            },

            plotFlow:function (id, index) {
                this.sequenceEditor && this.sequenceEditor.draw && this.sequenceEditor.draw(this.plotData, id, index);
            },

            tabulateData:function () {

                if (this.sequenceData) {
                    var sections = [];
                    for (var i = this.sequenceData.length - 1; i >= 0; --i) {
                        sections.push(new ChildSection({
                            name:'eventsection_t' + i,
                            title:'t=' + i,
                            parent:this.panelNode,
                            autoAdd:false,
                            collapse:true,
                            ignoreKey:true,
                            data:this.sequenceData[i]
                        }));
                    }

                    var args = {
                        sections:sections,
                        mainPanel:this.panelNode
                    };

                    this.timeline.tag.replace(args, this.panelNode.lastChild);
                }
            },


            // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //
            // Splitter

            onDragStart:function (tracker) {
                var body = Dom.getBody(this.document);
                body.setAttribute("resizingHtmlPreview", "true");

                var topPane = this.panelNode.querySelector(".topPane");
                this.startHeight = topPane.clientHeight;
            },

            onDragOver:function (newPos, tracker) {
                var body = Dom.getBody(this.document);
                if (body.getAttribute("resizingHtmlPreview")) {
                    var newHeight = (this.startHeight + newPos.y);
                    var topPane = this.panelNode.querySelector(".topPane");
                    if (this.panelNode.clientHeight) {
                        topPane.style.height = (newHeight / this.panelNode.clientHeight) * 100 + "%";
                    }
                }
            },

            onDrop:function (tracker) {
                var body = Dom.getBody(this.document);
                body.removeAttribute("resizingHtmlPreview");
            }
            // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //


        });

        with (Domplate) {
            eventPanel.prototype.timeline = domplate(ModelReps.DirTablePlate, {
                TIMELINE:IFRAME({src:"chrome://spa_eye/content/panels/eventPanel.xul",
                    width:"100%",
                    name:"timeline",
                    id:"timeline",
                    frameborder:"0",
                    class:"topPane"
                }),

                RESIZER:DIV({"class":"spa_eye_resizer"}),

                TABLE:DIV({width:"100%"})
            });
        }

        Firebug.registerPanel(Firebug.eventPanel);

        return Firebug.eventPanel;

    });
