<?php
/*
 * Plugin to embed bpmn-js based viewer and modeler to website.
 * CAUTION: This plugin requires you to add the mime type "bpmn" to your mime.local.conf file.
 * The added line should look like this:
 * "bpmn    !application/xml"
 *  @author peterfromearth <coder@peterfromearth>
 */


class action_plugin_bpmnioeditor_bpmnioeditor extends DokuWiki_Action_Plugin {

    function register(Doku_Event_Handler $controller)
    {
        // methods required for the diagram
        $controller->register_hook('AJAX_CALL_UNKNOWN', 'BEFORE', $this, 'ajax_save');
        $controller->register_hook('AJAX_CALL_UNKNOWN', 'BEFORE', $this, 'ajax_checkPermissions');

        // methods required for the Toolbar
        $controller->register_hook('TOOLBAR_DEFINE', 'AFTER', $this, 'addElementToToolbar', array());
    }

    function handle_internalmedia(Doku_Event $event, $param) {
		$data = $event->data;
		$data['link']['class'] = '';

        return;
    }
   
    
/* Begin of toolbar section */
    
    public function addElementToToolbar(Doku_Event $event, $param){
        $event->data[] = array(
          'type'=>'format',
          'title'=>$this->getLang('toolbar_name'),
          'icon'=>'../../plugins/bpmnioeditor/images/bpmn-file.png',
          'name'=>'bpmn_directory_chooser',
          'open'=>'{{',
          'close'=>'.bpmn}}',
          'block'=>'false',
        );
    }
    
    
/* End of toolbar section */
    
    public function ajax_checkPermissions(Doku_Event $event, $param){
        if($event->data !== 'bpmnio_permission'){
            return;
        }
        $event->stopPropagation();
        $event->preventDefault();
        
        $result = $this->_checkFilePermissions();        
        
        echo json_encode(['access'=>$result]);
    }
    
    public function ajax_save(Doku_Event $event, $param){
        if($event->data !== 'bpmnio_editor'){
            return;
        }
        
        $event->stopPropagation();
        $event->preventDefault();
        
        $result = [];
        if($this->_checkFilePermissions(true)){
        
            $this->_saveProcess();
            $result['success'] = true;
        } else {
            $result['success'] = false;
        }
        
        echo json_encode($result);
    }
    
    protected function _checkFilePermissions($secure = false){
        global $INPUT;
        
        if($this->getConf('treat_as_pages') == 1){
            $authLookup = array(
                    'view'=>AUTH_READ,
                    'edit'=>AUTH_EDIT,
                    'create'=>AUTH_CREATE,
            );
        } else {
            $authLookup = array(
                    'view'=>AUTH_READ,
                    'edit'=>AUTH_DELETE,
                    'create'=>AUTH_UPLOAD,
            );
        }

        $result = false;
        
        if($secure){
            //part to be requested for saving            
            if(file_exists(mediaFN($INPUT->str('name')))){
                $checkFor = $authLookup['edit'];
            } else {
                $checkFor = $authLookup['create'];
            }
            
            if(strlen($INPUT->str('name')) > 0){
                if(auth_quickaclcheck(cleanID(substr($INPUT->str('name'), 0, -5))) >= $checkFor){
                    $result = true;
                }
            }
        } else {
            //part for non critical requests
            if(strlen($INPUT->str('name')) > 0 && strlen($INPUT->str('type')) > 0 && array_key_exists($INPUT->str('type'), $authLookup)){
                if(auth_quickaclcheck(cleanID(substr($INPUT->str('name'), 0, -5))) >= $authLookup[$INPUT->str('type')]){
                    $result = true;
                }
            }  
        }
        return $result;
    }
    
    protected function _saveProcess(){
        global $INPUT;
        global $conf;
        global $ID;
        $ID = cleanID($INPUT->str('name'));
        
        $tmpFilename = uniqid($ID);
        $tmpFilename = str_replace(':', '_', $tmpFilename);
        
        file_put_contents($conf['tmpdir'].'/'.$tmpFilename, $INPUT->str('newXML'));
        
        $newFile = [
            'name' => $INPUT->str('name'),
            'id' => $ID,
            'type' => 'application/xml',
            'tmp_name' => $conf['tmpdir'].'/'.$tmpFilename,
            'error' => UPLOAD_ERR_OK,
            'size' => filesize($conf['tmpdir'].'/'.$tmpFilename),
            'mime' => 'application/xml',
            'ext' => 'bpmn'
       ];

        //the rename parameter is used to trick the move_uploaded_file" call
        $result = media_upload_finish($newFile['tmp_name'], mediaFN($newFile['id']), $newFile['id'], $newFile['mime'], true, 'rename');
        
        @unlink($newFile['tmp_name']);
    }
}
