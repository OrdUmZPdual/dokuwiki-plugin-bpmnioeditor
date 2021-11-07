//modeler
/*DOKUWIKI:include_once vendor/bpmnio-js/bpmn-modeler.development.js*/


//----------------------------------------------------------------------------------------------------------------
//everything below will handle the viewer and modeler

window.bpmn = [];

jQuery(document).ready(function(){
    jQuery('a.media.mediafile.mf_bpmn').each(function(index) {
        // START Insert html elements to display and edit
        var $bpmn = jQuery(this);			
        var $canvas_view = jQuery('<div id="bpmn_canvas_'+ index +'_view" class="plugin_bpmnioeditor canvas hidden" />').insertAfter($bpmn);
        var $canvas_edit = jQuery('<div id="bpmn_canvas_'+ index +'_edit" class="plugin_bpmnioeditor canvas hidden" />').insertAfter($canvas_view);

        window.bpmn[index] = [];
        window.bpmn[index]['name'] = getQuery($bpmn.attr('href'), 'media');
        //END Insert html elements to display and edit
        
        //START Insert buttons to the current field
        jQuery('<span style="float:right"> by <a href="https://peterfromearth.de">peterfromearth.de</a></span>').insertAfter($canvas_edit);
        jQuery('<button id="bpmn_'+index+'_edit_button" class="bpmnEditButton hidden" >'+LANG.plugins.bpmnioeditor.edit_bpmn+'</button>').insertAfter($canvas_edit);
        jQuery('<button id="bpmn_'+index+'_save_button" class="bpmnSaveButton hidden" style="margin-left:0.2%;">'+LANG.plugins.bpmnioeditor.save_bpmn+'</button>').insertAfter($canvas_edit);
        jQuery('<button id="bpmn_'+index+'_view_button" class="bpmnViewButton hidden" >'+LANG.plugins.bpmnioeditor.view_bpmn+'</button>').insertAfter($canvas_edit);
        
        jQuery('#bpmn_'+index+'_edit_button').on('click', function(){
            toggleButtons(index);
        });
        jQuery('#bpmn_'+index+'_view_button').on('click', function(){
            if(!confirm(LANG.plugins.bpmnioeditor.changes_not_saved)){
                return false;
            }
            toggleButtons(index);
            jQuery('#bpmn_'+index+'_edit_button').show();
            jQuery('#bpmn_'+index+'_view').toggleClass('hidden');
            changeToView($bpmn, index);
        });
        jQuery('#bpmn_'+index+'_save_button').on('click', function(){
            handleSaveButton($bpmn, index);
        });
        //END Insert buttons to the current field
        
        //START Check whether to display viewer
        jQuery.ajax({
            url: DOKU_BASE + 'lib/exe/ajax.php',
            method: 'POST',
            data: {
                call: 'bpmnio_permission',
                name: window.bpmn[index]['name'],
                type: 'view',
            },
            success: function(data){
                var result = jQuery.parseJSON(data);
                if(result.access == true){
                    changeToView($bpmn, index);
                }
            }
        });
        //END Check whether to display viewer
        
        //START Check file existence
        if($bpmn.hasClass('wikilink2')){
            window.bpmn[index]['type'] = 'create';
        } else {
            $bpmn.hide();
            window.bpmn[index]['type'] = 'edit';
        }
        // END Check fiile existence
        
        //START Check whether to display edit button
        jQuery.ajax({
            url: DOKU_BASE + 'lib/exe/ajax.php',
            method: 'POST',
            data: {
                call: 'bpmnio_permission',
                name: window.bpmn[index]['name'],
                type: window.bpmn[index]['type'],
            },
            success: function(data){
                var result = jQuery.parseJSON(data);
                if(result.access == true){
                    jQuery('#bpmn_'+index+'_edit_button').show();
                } else {
                    jQuery('#bpmn_'+index+'_edit_button').hide();
                }
            }
        });
        //END Check whether to display edit button	
        
        //START Handle edit button click
        jQuery('#bpmn_'+index+'_edit_button').on('click', function(){
            jQuery.ajax({
                url: DOKU_BASE + 'lib/exe/ajax.php',
                method: 'POST',
                data: {
                    call: 'bpmnio_permission',
                    name: window.bpmn[index]['name'],
                    type: window.bpmn[index]['type'],
                },
                success: function(data){
                    var result = jQuery.parseJSON(data);
                    if(result.access == true){
                        changeToEdit($bpmn, index);
                        jQuery($bpmn).unbind('click');
                        jQuery($bpmn).on('click', function(){
                            jQuery('#bpmn_'+index+'_edit_button').trigger('click');
                            return false;
                        });
                    } else {
                        jQuery('#bpmn_'+index+'_edit_button').hide();
                    }
                }
            });
        });
        //END Handle edit button click
    });
    
    function changeToEdit($bpmn, index){
        var BpmnJS = window.BpmnJS;
        var modeler;
        if(typeof window.bpmn[""+index]['edit'] == "undefined"){
            modeler = new BpmnJS({
                container: '#bpmn_canvas_'+index+'_edit'
            });
            window.bpmn[""+index]['edit'] = modeler;
        } else {
            modeler = window.bpmn[""+index]['edit'];
        }

        jQuery('#bpmn_canvas_'+index+'_view').hide();
        
        jQuery.ajax({
            url:$bpmn.attr('href'),
            dataType:'text',
            cache: false,
            success: async function(xml) {
                if(xml.length == 0){
                    xml = getDefaultDataIfFileNotExisting();
                }
                try {
                    await modeler.importXML(xml);
                    modeler.get('canvas').zoom('fit-viewport');
                } catch (err) {
                    console.log(LANG.plugins.bpmnioeditor.error_loading_bpmn, err);
                }

            },
            error: async function(){
                try {
                    const result = await modeler.importXML(getDefaultDataIfFileNotExisting());
                } catch (err) {
                    console.log(LANG.plugins.bpmnioeditor.error_loading_bpmn, err);
                }
            }
        });
        
        jQuery('#bpmn_canvas_'+index+'_edit').show();
        jQuery('#bpmn_'+index+'_edit_button').hide();
    }

    function changeToView($bpmn, index){
        var BpmnJS = window.BpmnJS;
        var viewer;
        
        jQuery('#bpmn_canvas_'+index+'_view').hide();
        
        if(typeof window.bpmn[""+index]['view'] == "undefined"){
            viewer = new BpmnJS.Viewer({
                container: '#bpmn_canvas_'+index+'_view',
                zoomScroll: { enabled: false }
            });
            window.bpmn[""+index]['view'] = viewer;
        } else {
            viewer = window.bpmn[""+index]['view'];
        }
        
        jQuery.ajax({
            url:$bpmn.attr('href'),
            dataType:'text',
            cache: false,
            success: async function(xml) {
                if(xml.length > 0){
                    
                    try {
                        await viewer.importXML(xml);
                        jQuery('#bpmn_canvas_'+index+'_view').show();
                        viewer.get('canvas').zoom('fit-viewport');
                       
                         if($bpmn.hasClass('wikilink2')){
                              $bpmn.hide();
                          }
                    } catch (err) {
                        console.log(LANG.plugins.bpmnioeditor.error_loading_bpmn, err);
                    }    
                }
            },
            error:function(){
                console.log(LANG.plugins.bpmnioeditor.error_loading_bpmn);
                jQuery('#bpmn_canvas_'+index+'_view').hide();
                jQuery('#bpmn_canvas_'+index+'_view').removeClass('canvas');
                jQuery('#bpmn_'+index+'_edit_button').text(LANG.plugins.bpmnioeditor.create_bpmn);
            },
        });
        jQuery('#bpmn_canvas_'+index+'_edit').hide();
    }

    function toggleButtons(index){
        jQuery('#bpmn_canvas_'+index+'_edit').toggleClass('hidden');
        jQuery('#bpmn_canvas_'+index+'_view').toggleClass('hidden');
        jQuery('#bpmn_'+index+'_view_button').toggleClass('hidden');
        jQuery('#bpmn_'+index+'_save_button').toggleClass('hidden');
        jQuery('#bpmn_'+index+'_edit_button').toggleClass('hidden');
        var sidebar = jQuery('#dokuwiki__aside');
        if(sidebar.length !== 0){   
            sidebar.css('position', 'relative');
        }
    }

    async function handleSaveButton($bpmn, index){
        //Reload page or simply save and reload changes.
        var resultSave;
        try {
            resultSave = await window.bpmn[index]['edit'].saveXML({format: true});
        } catch (err) {
            console.error(LANG.plugins.bpmnioeditor.error_saving_bpmn, err);
            return;
        }

        //transmitt new xml to the server
        jQuery.ajax({
            url: DOKU_BASE + 'lib/exe/ajax.php',
            dataType: 'json',
            method: 'POST',
            data: {
                call: 'bpmnio_editor',
                name: window.bpmn[index]['name'],
                newXML: resultSave.xml,
                type: window.bpmn[index]['type'],
            },
            success: async function(data){
                console.info(LANG.plugins.bpmnioeditor.bpmn_successfully_saved);
                const modeler = window.bpmn[""+index]['view'];
                try {
                    const result = await modeler.importXML(resultSave.xml);
                    modeler.get('canvas').zoom('fit-viewport');
                  
                    if(window.bpmn[index]['type'] == 'create'){
                        location.reload();
                    }
                } catch (err) {
                  console.log(LANG.plugins.bpmnioeditor.error_loading_bpmn, err.message, err.warnings);
                }
                
            },
            error: function(data) {
                console.error(data);
                alert("error" + data);
            },
        });

        jQuery('#bpmn_'+index+'_edit_button').text(LANG.plugins.bpmnioeditor.edit_bpmn);
        toggleButtons(index);
        jQuery('#bpmn_canvas_'+index+'_view').show();
        jQuery('#bpmn_canvas_'+index+'_edit').hide();
        jQuery('#bpmn_'+index+'_edit_button').show();
    }

    function getDefaultDataIfFileNotExisting(){
        return '<?xml version="1.0" encoding="UTF-8"?>'+
            '<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">' +
          '<bpmn:process id="Process_1" isExecutable="false" />' +
          '<bpmndi:BPMNDiagram id="BPMNDiagram_1">' +
            '<bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1" />' +
          '</bpmndi:BPMNDiagram>' +
        '</bpmn:definitions>';
    }

    function getQuery(searchstring, q) {
       return (searchstring.match(new RegExp('[?&]' + q + '=([^&]+)')) || [, null])[1];
    }
});


