import {Component, Input, OnInit} from "@angular/core";
import template from "./configFilter.component.html";
import style from "./configFilter.component.scss";
import {Mapping, ParamMapping} from "../../../../both/models/mapping.model";
import {MappingsDataService} from "../../services/mappings-data.service";
import {Config} from "../../../../both/models/config";
import {ConfigSetsDataService} from "../../services/configsets-data.service";
import {ConfigSet} from "../../../../both/models/configSet.model";
import {Filter} from "../../../../both/models/filter";
import {Option} from "../../../../both/models/option.interface";
import {FilterService} from "../../services/filter.service";
import {ParamAliases} from "../../../../both/models/paramAliases";
import { Session } from 'meteor/session'

declare let $ :any;
declare let _ : any;

@Component({
    selector: "configFilter",
    template,
    styles: [ style ]
})
export class ConfigFilterComponent implements OnInit{
    @Input() mappingID: string;

    private mapping: Mapping;
    private configs: Config[];
    private filters: Filter[];
    private hintText: string;

    constructor(
        private mappingDS: MappingsDataService,
        private configDS: ConfigSetsDataService,
    ) {
        this.filters = [];
        this.configs = [];
    }

    ngOnInit(): void {
        if (Session.get('filters')) {
            let sessionFilters = Session.get('filters');
            sessionFilters.forEach((filter : Filter) => {
                this.filters.push(new Filter(filter.key, filter.options, filter.active));
            });
            this.updateFilter();
        }
        this.mappingDS.getMappingById(this.mappingID).subscribe(mappings => {
            this.mapping = mappings[0];
        });
        this.configDS.getData().subscribe((data : ConfigSet[]) => {
            this.configs = [];
            data.forEach((configSet : ConfigSet) => {
                this.configs.push(new Config(configSet.name, configSet.description, configSet.projectID, configSet.params, configSet.results, (<any>configSet)._id));
            });
        });
        $(document).ready(() => {
            $('#addFilterModal').modal({
                complete: () => {
                    $('.collapsible').collapsible();
                },
                ready: () => {
                    let autoCompleteData = {};
                    if (this.mapping) {
                        this.mapping.params.forEach((paramWithAliases : ParamAliases) => {
                            autoCompleteData[paramWithAliases.key] = 0;
                        });
                    }
                    $('input.autocomplete').autocomplete({
                        data: autoCompleteData,
                        onAutocomplete: (val) => {
                            this.addFilter(val);
                            this.updateFilter();
                        }
                    });
                }
            });
        });
    }

    addFilter(key: string) {
        if (this.canAddFilter(key) == null) {
            let options : Option[] = [];
            let values = [];
            this.configs.forEach((config : Config) => {
                let val = config.getValueOf(key);
                if (val != '') {
                    values.push(val);
                }
            });
            values = _.uniq(values);
            values.forEach((val) => {
                options.push({name: val, enabled: true, meaning: ParamMapping.getFlagName(this.mapping.flags, val)});
            });
            this.filters.push(new Filter(key, options));
        } else {
            this.filters.splice(this.filters.indexOf(this.canAddFilter(key)), 1);
        }
        this.updateFilter();
    }

    canAddFilter(key :string) : Filter {
        let result = null;
        this.filters.forEach(filter => {
            if (filter.key === key) {
                result = filter;
            }
        });
        return result;
    }

    updateFilter() {
        FilterService.setFilters(this.filters);
        Session.set('filters', this.filters);
    }

    setModalHintText(paramWithAliases : ParamAliases) {
        this.hintText = paramWithAliases.key;
        paramWithAliases.aliases.forEach((alias) => {
            this.hintText += " - " + alias;
        });
    }

    openHeader() {
        $('.collapsible').collapsible();
    }

}