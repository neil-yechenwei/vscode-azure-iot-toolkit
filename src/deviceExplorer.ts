"use strict";
import { ConnectionString } from "azure-iot-device";
import * as vscode from "vscode";
import { AppInsightsClient } from "./appInsightsClient";
import { BaseExplorer } from "./baseExplorer";
import { Utility } from "./utility";
import iothub = require("azure-iothub");

export class DeviceExplorer extends BaseExplorer {
    constructor(outputChannel: vscode.OutputChannel, appInsightsClient: AppInsightsClient) {
        super(outputChannel, appInsightsClient);
    }

    public listDevice(): void {
        let label = "Device";
        let iotHubConnectionString = Utility.getConfig("iotHubConnectionString", "IoT Hub Connection String");
        if (!iotHubConnectionString) {
            return;
        }

        let registry = iothub.Registry.fromConnectionString(iotHubConnectionString);
        this._outputChannel.show();
        this.outputLine(label, "Querying devices...");
        this._appInsightsClient.sendEvent(`${label}.List`);
        registry.list((err, deviceList) => {
            this.outputLine(label, `${deviceList.length} device(s) found`);
            deviceList.forEach((device, index) => {
                this.outputLine(`${label}#${index + 1}`, JSON.stringify(device, null, 2));
            });
        });
    }

    public getDeviceById(): void {
        let label = "Device";
        let iotHubConnectionString = Utility.getConfig("iotHubConnectionString", "IoT Hub Connection String");
        if (!iotHubConnectionString) {
            return;
        }

        let connectionStringParam = ConnectionString.parse(iotHubConnectionString);
        let hostName = connectionStringParam.HostName;
        let registry = iothub.Registry.fromConnectionString(iotHubConnectionString);

        vscode.window.showInputBox({ prompt: "Enter device id to retrive device information" }).then((deviceId: string) => {
            if (deviceId !== undefined) {
                this._outputChannel.show();
                this.outputLine(label, `Retriving device ${deviceId}`);
                registry.get(deviceId, this.done("Get", label, hostName));
            }
        });
    }

    public createDevice(): void {
        let label = "Device";
        let iotHubConnectionString = Utility.getConfig("iotHubConnectionString", "IoT Hub Connection String");
        if (!iotHubConnectionString) {
            return;
        }
        let registry = iothub.Registry.fromConnectionString(iotHubConnectionString);

        vscode.window.showInputBox({ prompt: "Enter device id to create" }).then((deviceId: string) => {
            if (deviceId !== undefined) {
                let device = {
                    deviceId,
                };
                this._outputChannel.show();
                this.outputLine(label, `Creating device '${device.deviceId}'`);
                registry.create(device, this.done("Create", label));
            }
        });
    }

    public deleteDevice(): void {
        let label = "Device";
        let iotHubConnectionString = Utility.getConfig("iotHubConnectionString", "IoT Hub Connection String");
        if (!iotHubConnectionString) {
            return;
        }
        let registry = iothub.Registry.fromConnectionString(iotHubConnectionString);

        vscode.window.showInputBox({ prompt: "Enter device id to delete" }).then((deviceId: string) => {
            if (deviceId !== undefined) {
                this._outputChannel.show();
                this.outputLine(label, `Deleting device ${deviceId}`);
                registry.delete(deviceId, this.done("Delete", label));
            }
        });
    }

    private done(op: string, label: string, hostName: string = null) {
        return (err, deviceInfo, res) => {
            if (err) {
                this._appInsightsClient.sendEvent(`${label}.${op}`, { Result: "Fail" });
                this.outputLine(label, `[${op}] error: ${err.toString()}`);
            }
            if (res) {
                let result = "Fail";
                if (res.statusCode < 300) {
                    result = "Success";
                }
                this._appInsightsClient.sendEvent(`${label}.${op}`, { Result: result });
                this.outputLine(label, `[${op}][${result}] status: ${res.statusCode} ${res.statusMessage}`);
            }
            if (deviceInfo) {
                if (deviceInfo.authentication.SymmetricKey.primaryKey != null) {
                    let deviceConnectionStringWithKey = ConnectionString.createWithSharedAccessKey(hostName,
                        deviceInfo.deviceId, deviceInfo.authentication.SymmetricKey.primaryKey);
                    // tslint:disable-next-line:no-string-literal
                    deviceInfo["deviceConnectionStringWithKey"] = deviceConnectionStringWithKey;
                }
                if (deviceInfo.authentication.x509Thumbprint.primaryThumbprint != null) {
                    let deviceConnectionStringWithCert = ConnectionString.createWithX509Certificate(hostName, deviceInfo.deviceId);
                    // tslint:disable-next-line:no-string-literal
                    deviceInfo["deviceConnectionStringWithCert"] = deviceConnectionStringWithCert;
                }

                this.outputLine(label, `[${op}] device info: ${JSON.stringify(deviceInfo, null, 2)}`);
            }
        };
    }
}
