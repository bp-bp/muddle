var app = angular.module("mud_app", ["muddle"]);

app.controller("main_control", ["$scope", "data_muddle", "muddle_backend", function($scope, data_muddle, muddle_backend) {
	// dependencies
	$scope.dm = data_muddle;
	$scope.backend = muddle_backend;
	
	// these guys we'll get via closure
	var _current_entity = null;
	var _current_ents_by_type = {};
	var _current_type = null;
	var _current_master = null;
	
	// for debugging/exploring
	$scope.echo_data = function() {
		console.log($scope.dm);
	};
	
	$scope.echo_ents = function() {
		console.log($scope.dm.ents_by_type);
	};
	
	$scope.echo_modified = function() {
		console.log($scope.dm.modified_ents());
	};
	
	$scope.echo_types = function() {
		console.log($scope.dm.get_types());
	};
	
	$scope.echo_current = function() {
		console.log("current_entity");
		console.log($scope.current_entity());
		console.log("current_master");
		console.log($scope.current_master());
	};
	
	// the "current" entity being actively edited
	$scope.current_entity = function(ent) {
		if (angular.isDefined(ent)) {
			_current_entity = ent;
		}
		
		return _current_entity;
	};
	
	// the entity type being viewed
	$scope.current_type = function(type) {
		if (angular.isDefined(type)) {
			_current_type = type;
		}
		
		return _current_type;
	};
	
	$scope.current_master = function(master) {
		if (angular.isDefined(master)) {
			_current_master = master;
		}
		
		return _current_master;
	};
	
	// just wraps the data_muddle.new_blank_entity function, customization and integration
	// with the rest of the app can go in here
	$scope.ctrl_new_blank_entity = function(type) {
		var ent = $scope.dm.new_blank_entity(type);
		$scope.current_entity(ent);
		return ent;
	};
	
	$scope.ctrl_new_blank_master = function() {
		var go;
		if ($scope.dm.modified_ents().length > 0) {
			go = confirm("There are unsaved changes in the current company, if you load a new company these changes will be lost.\n\nLoad anyway?");
		}
		
		if (go) {
			var master = $scope.dm.new_blank_master();
			$scope.current_master(master);
			return master;
		}
	};
	
	$scope.save_something = function(something) {
		return $scope.backend.save(something, $scope.current_master());
	};
	
	$scope.ctrl_delete_entity = function(entity) {
		var go, confirm_str, affected_ents = $scope.dm.find_ent_in_ents(entity), ent_name = entity.get_child("name").val();
		
		// first handle any references to the entity to be deleted, if there are any
		if (affected_ents.length > 0) {
			var i, ent_str = "", name_array = [], clear_list;
			// build a string listing of the names of the affected entities to warn the user before 
			// clearing and deleting
			for (i = 0; i < affected_ents.length; i++) {
				name_array.push(affected_ents[i].get_child("name").val());
			}

			ent_str = name_array.join(", ");
			confirm_str = "The entity " + ent_name + " is referenced in the following other entities: \n\n" + ent_str + ".";
			confirm_str += "\n\nConfirm you want to delete this entity?";
		}
		else {
			confirm_str = "Confirm you want to delete " + ent_name + "?";
		}
		
		// get the user's response
		go = confirm(confirm_str);
		
		// stop everything if the user says no
		if (!go) {
			return;
		}
		
		// now clear out all references to this entity, keeping a list of which ents were affected
		clear_list = $scope.dm.clear_ent_from_ents(entity);
		// now actually delete the entity from the front-end...
		$scope.dm.delete_ent(entity);
		
		// and now save the affected ents and finally do the delete on the backend
		// if clear_list is empty this will just do nothing
		$scope.save_something(clear_list).then(
			// success
			function(payload) {
				console.log("save before delete successful.");
				return $scope.backend.delete(entity);
			},
			// fail
			function(payload) {
				console.log("save before delete failed...");
			}
		).then(
			// success
			function(payload) {
				// could do something here if you want... don't have to. Don't really have to have this second .then()
			},
			// fail
			function(payload) {
				// see above
			}
		);
	};
	
	$scope.ctrl_change_master = function(master, old_master) {
		var go = true, param_master = master || null;
		// check with the user before loading a new master dataset if there are unsaved changes in the current one
		
		if ($scope.dm.modified_ents().length > 0) {
			go = confirm("There are unsaved changes in the current company, if you load a new company these changes will be lost.\n\nLoad anyway?");
		}
		
		// check with the user...
		if (!go) {
			// this is odd... the interpolated old_master passed in via the ng-change directive like {{current_master()}} is an "Object"
			// rather than an "Entity" and looks like a copy. angular is fun!
			$scope.current_master($scope.dm.get_master(old_master.id));
			return;
		}
		
		// clear current data and load the new master dataset
		$scope.dm.init_keep_masters();
		$scope.backend.load_master(param_master).then(
			// success 
			function() {
				if ($scope.dm.ents.length > 0) {
					_current_entity = $scope.dm.ents[0];
				}
			},
			// fail
			function() {
				
			}
		);
	};
	
	
	// load everything
	$scope.dm.init_fresh_page();
	$scope.backend.load_all_masters().then(
		// success
		function(payload) {
			$scope.current_master($scope.dm.masters[0]);
			return $scope.backend.load_master($scope.current_master());
		},
		// fail
		function(payload) {
			// do something here if you want 
		}
	).then(
		// success
		function(payload) {
			if ($scope.dm.ents.length > 0) {
				$scope.current_entity($scope.dm.ents[0]);
			}
		},
		// fail
		function(payload) {
			console.log("issue after loading all masters");
		}
	);
	
	// if not using master-level ents, all ents will be saved under a null master_id
	// comment the load_all_masters() above and the masters section in the markup. 
	// then uncomment below, it will load everything saved under that null id
	/*
	$scope.backend.load_master().then(
		// success 
		function() {
			if ($scope.dm.ents.length > 0) {
				console.log("this happened");
				_current_entity = $scope.dm.ents[0];
			}
		},
		// fail
		function() {
			//console.log("error in load_master");
		}
	);
	*/

}]);

