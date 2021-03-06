//Setup LCARS Base Element Prototype Object
LCARS.element.column = function(oDef){
	//Begin Required
	this.data = {
		type:'column',
		id: oDef.id || 'columnSID'+ Math.random().toString(36).substr(2, 9)
	}
	
	this.receiver = {};
	this.event = {};
	this.broadcast = {};
    this.delete = {};
	this.dom = this.create(oDef);

	LCARS.active[this.data.id] = this;
	
	for(var prop in oDef){
		this.data[prop] = oDef[prop];
	}

	for(var prop in oDef){
		if(typeof this.setting[prop] === 'function'){
			this.setting[prop](this, oDef[prop]);
		}else if(typeof LCARS.setting[prop] === 'function'){
			LCARS.setting[prop](this, oDef[prop])
		}
		
	}
	
	return LCARS.active[this.data.id];
	//End Required
};

LCARS.element.column.prototype = {	
	//Required.  Create DOM element and base class
	create:function(oDef){
		if(oDef.href !== undefined){
			var element = $('<a id="'+this.data.id+'" class="column"></a>');
		}else{
			var element = $('<div id="'+this.data.id+'" class="column"></div>');
		}            
		return element;
	},	
	//Overide global settings
	setting:{},
	//Required. Set Value by Setting Name
	set:function(setting, value){
		if(setting !== 'id' && setting !== 'type'){
			if(typeof this.setting[setting] === 'function'){
				return this.setting[setting](this, value);
			}else if(typeof LCARS.setting[setting] === 'function'){
				return LCARS.setting[setting](this, value);
			}else{
				this.data[setting] = value;
				return true 
			}		
		}
	},
    
    get:function(setting){
        return this.data[setting];    
    }
};		



