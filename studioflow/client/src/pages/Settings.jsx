import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Settings as SettingsIcon, Wrench, Palette, Bell } from 'lucide-react';

export default function Settings() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 animate-fade-in">
        <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
          <SettingsIcon className="w-10 h-10 text-primary animate-spin-slow" />
          Settings
        </h1>
        <p className="text-gray-400">Customize your StudioFlow experience</p>
      </div>

      {/* Coming Soon Card */}
      <Card className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-slate-700/50 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-primary/10 animate-pulse"></div>
        <div className="relative p-12 text-center">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-primary/20 mb-6 animate-bounce">
            <Wrench className="w-12 h-12 text-primary" />
          </div>
          
          <Badge className="mb-4 bg-primary/20 text-primary border-primary/30 px-4 py-1">
            Coming Soon
          </Badge>
          
          <h2 className="text-3xl font-bold text-white mb-4">
            Advanced Settings Coming!
          </h2>
          
          <p className="text-gray-400 text-lg mb-8 max-w-2xl mx-auto">
            Soon you'll be able to customize your workspace, manage team members, 
            set up notifications, and personalize your StudioFlow experience.
          </p>

          {/* Feature Preview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50 hover:border-primary/50 transition-all hover:scale-105 duration-300">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-4 mx-auto">
                <Palette className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-white font-semibold mb-2">Theme Customization</h3>
              <p className="text-gray-400 text-sm">Choose your preferred color scheme and layout</p>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50 hover:border-primary/50 transition-all hover:scale-105 duration-300">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-4 mx-auto">
                <Bell className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-white font-semibold mb-2">Notifications</h3>
              <p className="text-gray-400 text-sm">Control what updates you receive and how</p>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50 hover:border-primary/50 transition-all hover:scale-105 duration-300">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-4 mx-auto">
                <SettingsIcon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-white font-semibold mb-2">Workspace Settings</h3>
              <p className="text-gray-400 text-sm">Manage team members, roles, and permissions</p>
            </div>
          </div>

          <div className="mt-12">
            <Button className="bg-primary hover:bg-primary/90 text-white px-8 py-3 text-lg font-semibold shadow-lg shadow-primary/20 hover:scale-105 transition-transform duration-300">
              Notify Me When Available
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
