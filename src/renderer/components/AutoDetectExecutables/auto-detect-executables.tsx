import "./auto-detect-executables.scss"

import { t, Trans } from '@lingui/macro';
import { toJS } from "mobx";
import React from "react";
import { AutoDetectExecVersion, VersionFindingScheme, getDefaultIntoDir, SupportedExecutables, } from "../../../common/multi-placement-options";
import { Select } from "../select";
import { isPath } from '../input/input.validators';
import { capitalize } from 'lodash';
import fse from 'fs-extra';
import { Input } from "../input";
import { SubTitle } from "../layout/sub-title";
import { _i18n } from "../../i18n";

interface Props {
  preferences: AutoDetectExecVersion;
}

export class AutoDetectExectuables extends React.Component<Props> {
  render() {
    const { preferences } = this.props;
    return <>
      <Select
        value={preferences.autoDetectExecVersions?.versionFindingScheme}
        options={Object.values(VersionFindingScheme)}
        isClearable={true}
        placeholder="Select scheme..."
        onChange={(option, action) => {
          const auto = toJS(preferences);
          auto.autoDetectExecVersions ??= {};
          switch (action.action) {
          case "clear":
            delete auto.autoDetectExecVersions.versionFindingScheme;
            break;
          default:
            auto.autoDetectExecVersions.versionFindingScheme = option.value;
            break;
          }
          preferences.autoDetectExecVersions = auto.autoDetectExecVersions;
        }} 
      />
      <small>
        <Trans>The mechanism for selecting version of executables. Defaults to automatic.</Trans>
      </small>
      <Input
        className="AutoDetectExecutables download-dir"
        value={preferences.autoDetectExecVersions?.intoDir}
        onChange={value => {
          const auto = toJS(preferences);
          auto.autoDetectExecVersions ??= {};
          auto.autoDetectExecVersions.intoDir = value;
          preferences.autoDetectExecVersions = auto.autoDetectExecVersions;
        }}
        placeholder={`Directory to download binaries into. `}
        validators={isPath}
        type="text" 
      />
      <small>
        Default: {getDefaultIntoDir()}
      </small>
      <div className="AutoDetectExecutables list">
        {Object.entries(SupportedExecutables)
          .map(([, name]) => (
            <React.Fragment key={name}>
              <h4 key={`${name}-name`} >{capitalize(name)}</h4>
              <Select
                key={`${name}-select`}
                value={preferences.autoDetectExecVersions?.for?.[name]?.versionFindingScheme}
                options={Object.values(VersionFindingScheme)}
                isClearable={true}
                isCreatable={true}
                placeholder={`Select scheme or input path to ${name}...`}
                isValidNewOption={fse.pathExistsSync}
                onChange={(option, action) => {
                  const nonTrackedPrefs = toJS(preferences);
                  ((nonTrackedPrefs.autoDetectExecVersions ??= {}).for ??= {})[name] ??= {};
                  switch (action.action) {
                  case "clear":
                    delete nonTrackedPrefs.autoDetectExecVersions.for[name].versionFindingScheme;
                    break;
                  default:
                    nonTrackedPrefs.autoDetectExecVersions.for[name].versionFindingScheme = option.value;
                    break;
                  }
                  preferences.autoDetectExecVersions = nonTrackedPrefs.autoDetectExecVersions;
                }} />
              <small key={`${name}-select-small`}>
                <Trans>The mechanism for selecting version of executables.</Trans>{" "}
                <Trans>Defaults to automatic.</Trans>{" "}
                <Trans>Adding an option sets the executable to manual detection mode.</Trans>
              </small>
            </React.Fragment>
          ))}
      </div>
    </>
  }
}