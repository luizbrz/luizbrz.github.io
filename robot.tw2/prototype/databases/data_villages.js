define("robotTW2/databases/data_villages", [
	"robotTW2/databases/database",
	"robotTW2/conf",
	"robotTW2/services",
	"robotTW2/providers",
	"robotTW2/calculateTravelTime",
	], function(
			database,
			conf,
			services,
			providers,
			calculateTravelTime
	){
	var rallyPointSpeedBonusVsBarbarians = services.modelDataService.getWorldConfig().getRallyPointSpeedBonusVsBarbarians()
	, get_dist = function (v, max_journey_time, units) {
		var village = services.villageService.getInitializedVillage(v)
		, army = {
			'officers'	: {},
			"units"		: units
		}
		, travelTime = calculateTravelTime(army, village, "attack", {
			'barbarian'		: true
		})

		return Math.trunc((max_journey_time / 1000 / travelTime) / 2);
	}
	, getPst = function (v) {
		var presets_d = angular.copy(services.presetListService.getPresetsForVillageId(v))
		if(!Object.keys(presets_d).length) {return {}}
		if(!data_villages.villages[v]){data_villages.villages[v] = {"presets" : {}}}
		Object.keys(presets_d).forEach(function (pst) {
			if(!data_villages.villages[v].presets){data_villages.villages[v].presets = {}}
			Object.keys(data_villages.villages[v].presets).map(function (id) {
				if(!Object.keys(presets_d).find(f => f == id)) {
					delete data_villages.villages[v].presets[id]
				}
			})
			if(!Object.keys(data_villages.villages[v].presets).find(f => f == pst)) {
				if(!data_villages.villages[v].presets[pst]){
					angular.extend(presets_d[pst], {
						load					: true,
						max_journey_distance	: get_dist(v, conf.MAX_JOURNEY_TIME, presets_d[pst].units),
						min_journey_distance	: get_dist(v, conf.MIN_JOURNEY_TIME, presets_d[pst].units),
						max_journey_time		: conf.MAX_JOURNEY_TIME,
						min_journey_time		: conf.MIN_JOURNEY_TIME,
						max_points_farm			: conf.MAX_POINTS_FARM,
						min_points_farm			: conf.MIN_POINTS_FARM,
						quadrants				: [1, 2, 3, 4],
						max_commands_farm		: conf.MAX_COMMANDS_FARM
					});
				} 
			} else {
				if(!data_villages.villages[v].presets[pst].load){
					angular.extend(presets_d[pst], {
						load					: true,
						max_journey_distance	: get_dist(v, conf.MAX_JOURNEY_TIME, presets_d[pst].units),
						min_journey_distance	: get_dist(v, conf.MIN_JOURNEY_TIME, presets_d[pst].units),
						max_journey_time		: conf.MAX_JOURNEY_TIME,
						min_journey_time		: conf.MIN_JOURNEY_TIME,
						max_points_farm			: conf.MAX_POINTS_FARM,
						min_points_farm			: conf.MIN_POINTS_FARM,
						quadrants				: [1, 2, 3, 4],
						max_commands_farm		: conf.MAX_COMMANDS_FARM
					});
				}
			}
//			data_villages.villages[v].presets[pst] = angular.extend({}, presets_d[pst])
			if(!data_villages.villages[v].presets[pst]){
				data_villages.villages[v].presets[pst] = presets_d[pst]
			} else {
				angular.extend(data_villages.villages[v].presets[pst], presets_d[pst])
			}
		});
		return data_villages.villages[v].presets;
	}
	, data_villages = database.get("data_villages") || {}
	, db_villages = {}
	db_villages.set = function(){
		database.set("data_villages", data_villages, true)
	}
	db_villages.get = function(){
		return database.get("data_villages")
	}
	db_villages.verifyDB = function (villagesExtended){
		updated = false;
		if(!data_villages){data_villages = {}}
		if(!villagesExtended){villagesExtended = {}}
		if(data_villages.villages == undefined){data_villages.villages = {}}
		Object.keys(data_villages.villages).map(function(m){
			return m
		}).forEach(function(v){
			if(!villagesExtended[v]){
				delete data_villages.villages[v]
				updated = true;
			}
		})
		return updated;
	}

	var id = 0;

	db_villages.verifyVillages = function (villagesExtended, callback){

		if(services.modelDataService.getPresetList().isLoadedValue){
			if(!data_villages){data_villages = {}}
			if(!villagesExtended){villagesExtended = {}}
			let update = false;
			if(data_villages.villages == undefined){data_villages.villages = {}}
			Object.keys(villagesExtended).map(function(m){
				if(!data_villages.villages[m]
				|| !data_villages.villages[m].buildingorder 
				|| !data_villages.villages[m].buildinglimit
				|| !data_villages.villages[m].buildinglevels
				){
					angular.extend(villagesExtended[m], {
						buildingorder 			: conf.BUILDINGORDER,
						buildinglimit 			: conf.BUILDINGLIMIT,
						buildinglevels 			: conf.BUILDINGLEVELS,
						farm_activate 			: true,
						defense_activate 		: true,
						headquarter_activate	: true,
						recruit_activate		: true,
						sniper_defense			: true,
						sniper_attack			: true,
						presets					: getPst(m),
						selected				: null//selects.find(f=>f.name=="standard")
					})
					data_villages.villages[m] = angular.extend({}, villagesExtended[m])
					update = true;
					return m;
				} else {
					if(data_villages.villages[m].presets){
						angular.merge(villagesExtended[m], {
							presets					: getPst(m)
						})
						angular.extend(data_villages.villages[m], villagesExtended[m])
						update = true;
					}
					return m;
				}
			})
			callback(update)
			return;
		} else {
			services.socketService.emit(providers.routeProvider.GET_PRESETS, {}, function(){
				return db_villages.verifyVillages(villagesExtended, callback)
			});
		}
	}

	db_villages.updateVillages = function($event){
		var updated = false;
		var villages = services.modelDataService.getVillages();
		var villagesExtended = {};
		try{
			Object.keys(villages).map(function(village_id){

				villagesExtended[village_id] = {}
				var vill = services.villageService.getInitializedVillage(village_id)
			})
		} catch (err){
			return
		}

		var promise = new Promise(function(res, rej){
			db_villages.verifyVillages(villagesExtended, function(updated){
				updated ? res() : rej()
			})
		})
		.then(function(){
			if(db_villages.verifyDB(villagesExtended)) {
				data_villages.version = conf.VERSION.VILLAGES
			}
			db_villages.set();
		}, function(){

			if(!data_villages.version || (typeof(data_villages.version) == "number" ? data_villages.version.toString() : data_villages.version) < conf.VERSION.VILLAGES){
				data_villages = {};
				data_villages.version = conf.VERSION.VILLAGES
				db_villages.set();
				db_villages.updateVillages();
			}
		})
	}

	db_villages.getAssignedPresets = function(){
		var presetsByVillage = services.modelDataService.getPresetList().presetsByVillage;
		Object.keys(data_villages.villages).map(function(a){
			data_villages.villages[a].assigned_presets = presetsByVillage[a] ? Object.keys(presetsByVillage[a]) : [];
		})
		db_villages.set();
	}
	
	db_villages.getQuadrants = function(village_id, preset_id){
		return data_villages.villages[village_id].presets[preset_id].quadrants
	}

	services.$rootScope.$on(providers.eventTypeProvider.VILLAGE_LOST, function(){
		services.$timeout(function(){
			db_villages.updateVillages()
		}, 10000)
		
	});
	services.$rootScope.$on(providers.eventTypeProvider.VILLAGE_CONQUERED, function(){
		services.$timeout(function(){
			db_villages.updateVillages()	
		}, 10000)
	});

	services.$rootScope.$on(providers.eventTypeProvider.ARMY_PRESET_DELETED, db_villages.updateVillages);
	services.$rootScope.$on(providers.eventTypeProvider.ARMY_PRESET_ASSIGNED, db_villages.updateVillages);
	services.$rootScope.$on(providers.eventTypeProvider.ARMY_PRESET_SAVED, db_villages.updateVillages);

	if(!data_villages.version || (typeof(data_villages.version) == "number" ? data_villages.version.toString() : data_villages.version) < conf.VERSION.VILLAGES){
		data_villages = {};
		data_villages.version = conf.VERSION.VILLAGES
		db_villages.updateVillages();
	} else {
		db_villages.updateVillages()	
	}

	Object.setPrototypeOf(data_villages, db_villages);

	return data_villages;
})
