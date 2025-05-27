
import React from 'react';
import { User, Mail, Briefcase, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';

export const ProfileApp: React.FC = () => {
  const { user } = useAuth();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-display font-bold text-brius-black mb-2">Profile</h2>
        <p className="text-brius-gray font-body">Manage your account information and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="font-display">Profile Picture</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <Avatar className="h-32 w-32 mx-auto">
              <AvatarImage src={user?.avatar} alt={user?.name} />
              <AvatarFallback className="bg-brius-primary text-white font-display text-2xl">
                {user?.name ? getInitials(user.name) : 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-display font-semibold text-lg">{user?.name}</h3>
              <p className="text-brius-gray font-body">{user?.role}</p>
            </div>
            <Button variant="outline" className="w-full">
              Upload New Photo
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-display">Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-display font-medium">Full Name</label>
                <div className="flex items-center gap-2 p-3 border rounded-lg bg-gray-50">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="font-body">{user?.name}</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-display font-medium">Email</label>
                <div className="flex items-center gap-2 p-3 border rounded-lg bg-gray-50">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span className="font-body">{user?.email}</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-display font-medium">Role</label>
                <div className="flex items-center gap-2 p-3 border rounded-lg bg-gray-50">
                  <Briefcase className="h-4 w-4 text-gray-500" />
                  <span className="font-body">{user?.role}</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-display font-medium">Member Since</label>
                <div className="flex items-center gap-2 p-3 border rounded-lg bg-gray-50">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="font-body">January 2024</span>
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <Button>Save Changes</Button>
              <Button variant="outline">Cancel</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
