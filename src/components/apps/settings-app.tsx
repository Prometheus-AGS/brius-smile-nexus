
import React from 'react';
import { Bell, Shield, Palette, Globe } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';

export const SettingsApp: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-display font-bold text-brius-black mb-2">Settings</h2>
        <p className="text-brius-gray font-body">Configure your application preferences and account settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="font-body font-medium">Email notifications</label>
                <p className="text-sm text-brius-gray">Receive email updates about your account</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="font-body font-medium">Push notifications</label>
                <p className="text-sm text-brius-gray">Receive push notifications in your browser</p>
              </div>
              <Switch />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="font-body font-medium">Order updates</label>
                <p className="text-sm text-brius-gray">Get notified about order status changes</p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="font-body font-medium">Two-factor authentication</label>
                <p className="text-sm text-brius-gray">Add an extra layer of security</p>
              </div>
              <Switch />
            </div>
            <div className="space-y-2">
              <Button variant="outline" className="w-full">
                Change Password
              </Button>
              <Button variant="outline" className="w-full">
                Download Data
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Appearance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="font-body font-medium">Dark mode</label>
                <p className="text-sm text-brius-gray">Switch to dark theme</p>
              </div>
              <Switch />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="font-body font-medium">Compact view</label>
                <p className="text-sm text-brius-gray">Use a more condensed layout</p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="font-body font-medium">Auto-save</label>
                <p className="text-sm text-brius-gray">Automatically save your work</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="font-body font-medium">Analytics</label>
                <p className="text-sm text-brius-gray">Help improve our service</p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-3">
        <Button>Save Settings</Button>
        <Button variant="outline">Reset to Defaults</Button>
      </div>
    </div>
  );
};
