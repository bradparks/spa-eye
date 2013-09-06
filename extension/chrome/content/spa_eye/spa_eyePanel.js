/* See license.txt for terms of usage */
define([
    "firebug/firebug",
    "firebug/lib/object",
    "firebug/lib/trace",
    "firebug/lib/locale",
    "firebug/lib/domplate",
    "firebug/lib/dom",
    "firebug/lib/css",
    "firebug/lib/events",
    "firebug/lib/string",
    "firebug/chrome/toolbar",
    "firebug/dom/domEditor",

    "spa_eye/lib/require/underscore",
    "spa_eye/util/common",
    "spa_eye/panels/basePanel",
    "spa_eye/plates/modelPlate",
    "spa_eye/plates/collectionPlate",
    "spa_eye/plates/viewPlate",
    "spa_eye/plates/zombiePlate",
    "spa_eye/panels/basePanel"
],
    function (Firebug, Obj, FBTrace, Locale, Domplate, Dom, Css, Events, Str, Toolbar, DOMEditor, _, Common, BasePanel, ModelPlate, CollectionPlate, ViewPlate, ZombiePlate) {

        var childPlate = {
            MODEL:'model',
            COLLECTION:'collection',
            VIEW:'view',
            ZOMBIE:'zombie'
        };
        var spa_eyePanel = Firebug.spa_eyePanel = BasePanel.extend(Obj.extend(Firebug.ActivablePanel, {
            name:"spa_eye",
            tooltip:Locale.$STR("spa_eye.tooltip"),
            title:Locale.$STR("spa_eye.title"),
            searchable:true,
            editable:true,
            inspectable:true,
            inspectHighlightColor:"green",
            inspectedViewIndex:-1,
            editor:undefined,

            enableA11y:true,
            deriveA11yFrom:"dom",

            currentPlate:childPlate.MODEL,
            plates:null,
            logger:null,

            initialize:function () {
                this._super.apply(this, arguments);
                Firebug.registerUIListener(this);

                // Initialize plates
                var args = {
                    context:this.context,
                    parent:this
                }
                this.plates = {};
                this.plates.model = new ModelPlate(args);
                this.plates.collection = new CollectionPlate(args);
                this.plates.view = new ViewPlate(args);
                this.plates.zombie = new ZombiePlate(args);

                // set currentPlate
                var spObj = this.context.spa_eyeObj;
                if (spObj && spObj.currentPlate) {
                    this.currentPlate = spObj.currentPlate;
                }
            },

            onBackboneLoaded:function () {
                this.show();
            },

            show:function (state) {
                var enabled = this.isEnabled();
                if (!enabled) return;

                var active = !this.showWarning();
                var panelToolbar = Firebug.chrome.$("fbPanelToolbar");

                if (active) {
                    var buttons = this.getSPA_EyeToolbar();
                    for (var i = 0; i < buttons.length; ++i)
                        Toolbar.createToolbarButton(panelToolbar, buttons[i]);

                    this.selectChildPlate();
                    Dom.collapse(panelToolbar, false);

                    if (!this.activated) {
                        var self = this;

                        var sidePanelsLoaded = Firebug.auditPanel || Firebug.viewPanel || Firebug.eventPanel;

                        if (!sidePanelsLoaded) {
                            define([
                                "spa_eye/panels/viewPanel",
                                "spa_eye/panels/auditPanel",
                                "spa_eye/panels/eventPanel",
                                "spa_eye/panels/logPanel"
                            ], function (ViewPanel, AuditPanel, EventPanel, LogPanel) {
                                Firebug.registerPanel(Firebug.auditPanel);
                                Firebug.registerPanel(Firebug.eventPanel);
                                Firebug.registerPanel(Firebug.logPanel);
                                Firebug.registerPanel(Firebug.viewPanel);
                                Events.dispatch(Firebug.uiListeners, "updateSidePanels", [self]);
                            });
                        }
                        this.activated = true;
                        this.logger = this.context.getPanel("spa_eye:logs");
                    }
                } else {
                    this.cleanup();
                    Dom.collapse(panelToolbar, true);
                    this.activated = false;
                }
                this.logger && this.logger.show();

            },

            onActivationChanged:function (enable) {
                if (enable) {
                    Firebug.spa_eyeModule.addObserver(this);
                    Firebug.currentContext.spa_eyeObj._spaHook.registerContentLoadedHook.call(
                        Firebug.currentContext.spa_eyeObj._spaHook,
                        Firebug.currentContext.window.wrappedJSObject
                    );
                } else {

                    Firebug.spa_eyeModule.removeObserver(this);
                }
            },


            inspectNode:function (node) {
                if (this.currentPlate === childPlate.VIEW && this.inspectingObject) {
                    this.plates.view.expandSelectedView(this.inspectingObject);
                }
                return false;
            },

            supportsObject:function (object, type) {
                var views = this.context.spa_eyeObj.getViews();
                this.inspectingObject = _.findWhere(views, {el:object});
                return this.inspectingObject;
            },

            showWarning:function () {
                var scriptPanel = this.context.getPanel('script'),
                    hooked = this.context.spa_eyeObj.hooked();

                if (!(hooked && scriptPanel && !scriptPanel.showWarning())) {
                    return this.showNotHooked();
                } else {
                    try {
                        var v = Firebug.getVersion().split('.');
                        if (parseInt(v[0], 10) === 1 && parseInt(v[1], 10) < 11) {
                            return this.showFirebugUpgrade();
                        }
                    } catch (e) {
                    }
                }
                return false;
            },

            showFirebugUpgrade:function () {
                var args = {
                    pageTitle:Locale.$STR("spa_eye.warning.upgrade_firebug"),
                    suggestion:Locale.$STR("spa_eye.suggestion.upgrade_firebug")
                };
                return this.WarningRep.tag.replace(args, this.panelNode);
            },

            showNotHooked:function () {
                var args = {
                    pageTitle:Locale.$STR("spa_eye.warning.inactive_during_page_load"),
                    suggestion:Locale.$STR("spa_eye.suggestion.inactive_during_page_load2")
                };

                var box = this.WarningRep.tag.replace(args, this.panelNode);
                var description = box.getElementsByClassName("disabledPanelDescription").item(0);
                return FirebugReps.Description.render(args.suggestion,
                    description,
                    Obj.bindFixed(Firebug.TabWatcher.reloadPageFromMemory,
                        Firebug.TabWatcher,
                        Firebug.currentContext));
            },

            getSPA_EyeToolbar:function () {

                var buttons = [];

                var isRecording = Firebug.Options.get("spa_eye.record");
                buttons.push(
                    {
                        id:"spa_eye_panel_button_record",
                        tooltiptext:Locale.$STR("spa_eye.record_events"),
                        image:isRecording
                            ? "chrome://spa_eye/skin/recording.svg"
                            : "chrome://spa_eye/skin/norecording.svg",
                        type:"checkbox",
                        checked:isRecording,
                        className:"toolbar-image-button fbInternational",
                        command:FBL.bindFixed(this.toggleRecord, this)
                    },
                    "-",
                    {
                        tooltiptext:Locale.$STR("spa_eye.clear"),
                        image:"chrome://spa_eye/skin/remove.svg",
                        className:"toolbar-image-button fbInternational",
                        command:FBL.bindFixed(this.resetTrackingData, this)
                    },
                    "-",
                    {
                        id:"spa_eye_panel_button_model",
                        label:"spa_eye.models",
                        type:"radio",
                        checked:true,
                        className:"toolbar-text-button fbInternational",
                        tooltiptext:"spa_eye.models",
                        command:FBL.bindFixed(this.selectChildPlate, this, childPlate.MODEL)
                    },
                    {
                        id:"spa_eye_panel_button_collection",
                        label:"spa_eye.collections",
                        type:"radio",
                        className:"toolbar-text-button fbInternational",
                        tooltiptext:"spa_eye.collections",
                        command:FBL.bindFixed(this.selectChildPlate, this, childPlate.COLLECTION)
                    },
                    {
                        id:"spa_eye_panel_button_view",
                        label:"spa_eye.views",
                        type:"radio",
                        className:"toolbar-text-button fbInternational",
                        tooltiptext:"spa_eye.views",
                        command:FBL.bindFixed(this.selectChildPlate, this, childPlate.VIEW)
                    },
                    {
                        id:"spa_eye_panel_button_zombie",
                        label:"spa_eye.zombies",
                        type:"radio",
                        className:"toolbar-text-button fbInternational",
                        tooltiptext:"spa_eye.zombies",
                        command:FBL.bindFixed(this.selectChildPlate, this, childPlate.ZOMBIE)
                    }
                );
                return buttons;
            },

            selectChildPlate:function (cpName) {
                cpName = cpName || this.currentPlate;
                if (!cpName) return false;

                var listener = this.context.spa_eyeObj._spaHook.listener,
                    chrome = Firebug.chrome;

                listener.removeListener(this.getCurrentPlate());

                Object.keys(childPlate).forEach(function (key) {
                    chrome.$('spa_eye_panel_button_' + childPlate[key]).checked = false;
                });
                chrome.$('spa_eye_panel_button_' + cpName).checked = true;

                this.context.spa_eyeObj.currentPlate = this.currentPlate = cpName;

                listener.addListener(this.getCurrentPlate());
                this.getCurrentPlate().render();
            },

            toggleRecord:function () {
                var recordButton = Firebug.chrome.$('spa_eye_panel_button_record');
                var spa_eyeObj = this.context.spa_eyeObj;
                if (recordButton) {
                    recordButton.image = recordButton.checked
                        ? "chrome://spa_eye/skin/recording.svg"
                        : "chrome://spa_eye/skin/norecording.svg";
                    Firebug.Options.set("spa_eye.record", !!recordButton.checked);
                }
            },

            cleanup:function () {
                this.context.spa_eyeObj.cleanup();
                var eyelogs = this.context.getPanel("spa_eye:logs");
                eyelogs && eyelogs.show();
            },

            resetTrackingData:function () {
                this.context.spa_eyeObj.resetTrackingData();
            },

            getCurrentPlate:function (plateName) {
                return this.plates[plateName || this.currentPlate];
            },

            getOptionsMenuItems:function () {
                var versionLabel = Locale.$STR('spa_eye.about')
                    .replace('$VERSION$', Common.getVersion("chrome://spa_eye/content/build.properties"));
                return [
                    {
                        label:versionLabel,
                        nol10n:true
                    }
                ];
            },

            optionMenu:function (label, option) {
                var value = Firebug.getPref(Firebug.prefDomain, option);
                return {
                    label:label,
                    nol10n:true,
                    type:"checkbox",
                    checked:value,
                    command:FBL.bindFixed(Firebug.setPref, this, Firebug.prefDomain, option, !value)
                };
            },

            getContextMenuItems:function (object, target) {
                var row = Dom.getAncestorByClass(target, "memberRow");
                var items = [];
                if (row && row.domObject && (0 === parseInt(row.getAttribute('level'), 10))) {
                    var cp = this.plates[this.currentPlate];

                    if (this.currentPlate === childPlate.MODEL) {
                        var model = row.domObject.value;

                        items.push(
                            "-",
                            {
                                label:(model
                                    && model.cid
                                    && this.context.spa_eyeObj._pinned_models[model.cid])
                                    ? "Un_Pin_Model" : "Pin_Model",
                                command:Obj.bindFixed(cp.pinOptionChange, cp, row)
                            }
                        );
                    }
                }
                return items;
            },

            search:function () {
                var p = this.getCurrentPlate();
                return p && p.search && p.search.apply(p, arguments);
            },

            onSelectRow:function () {
                var p = this.getCurrentPlate();
                return p && p.onSelectRow && p.onSelectRow.apply(p, arguments);
            },

            getEditor:function (target, value) {
                if (!this.editor) {
                    this.editor = new DOMEditor(this.document);
                }
                return this.editor;
            },

            setPropertyValue:function () {
                var p = this.getCurrentPlate();
                return p && p.setPropertyValue && p.setPropertyValue.apply(p, arguments);
            }

        }));

        with (Domplate) {
            spa_eyePanel.prototype.WarningRep = domplate(Firebug.ScriptPanel.WarningRep, {
                tag:DIV({"class":"disabledSPA_EyePanelBox"},
                    H1({"class":"disabledPanelHead"},
                        SPAN("$pageTitle")
                    ),
                    P({"class":"disabledPanelDescription", style:"margin-top: 15px;"},
                        SPAN("$suggestion")
                    )
                )

            });
        }

        Firebug.registerPanel(Firebug.spa_eyePanel);
        return Firebug.spa_eyePanel;
    });
