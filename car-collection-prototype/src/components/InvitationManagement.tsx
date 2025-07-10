'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiAxios } from '@/lib/apiAxios';
import { Copy, Trash2, Mail, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Invitation {
  id: number;
  email: string;
  token: string;
  invited_by: string;
  is_admin: boolean;
  used: boolean;
  used_by?: string;
  expires_at: string;
  created_at: string;
  is_expired: boolean;
}

export function InvitationManagement() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [email, setEmail] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [showUsed, setShowUsed] = useState(false);

  useEffect(() => {
    loadInvitations();
  }, [showUsed]);

  const loadInvitations = async () => {
    try {
      const response = await apiAxios.get(`/api/invitations?include_used=${showUsed}`);
      setInvitations(response.data);
    } catch (error) {
      toast.error('Failed to load invitations');
    } finally {
      setLoading(false);
    }
  };

  const createInvitation = async () => {
    if (!email) {
      toast.error('Please enter an email address');
      return;
    }

    setCreating(true);
    try {
      const response = await apiAxios.post('/api/invitations/create', {
        email,
        is_admin: isAdmin
      });
      
      // Copy invitation URL to clipboard
      navigator.clipboard.writeText(response.data.invitation_url);
      toast.success('Invitation created and URL copied to clipboard!');
      
      setEmail('');
      setIsAdmin(false);
      loadInvitations();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to create invitation');
    } finally {
      setCreating(false);
    }
  };

  const deleteInvitation = async (id: number) => {
    if (!confirm('Are you sure you want to delete this invitation?')) {
      return;
    }

    try {
      await apiAxios.delete(`/api/invitations/${id}`);
      toast.success('Invitation deleted');
      loadInvitations();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to delete invitation');
    }
  };

  const getInvitationUrl = (response: any) => {
    // Use the invitation_url from the API response if available
    return response.invitation_url || `${window.location.origin}/register?token=${response.token}`;
  };

  const copyInvitationUrl = (invitation: Invitation) => {
    const frontendUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || window.location.origin;
    const invitationUrl = `${frontendUrl}/register?token=${invitation.token}`;
    navigator.clipboard.writeText(invitationUrl);
    toast.success('Invitation URL copied to clipboard');
  };

  const sendInvitationEmail = (invitation: Invitation) => {
    const frontendUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || window.location.origin;
    const invitationUrl = `${frontendUrl}/register?token=${invitation.token}`;
    const subject = 'Invitation to Car Collection Manager';
    const body = `You've been invited to join Car Collection Manager!

Click the following link to create your account:
${invitationUrl}

This invitation will expire on ${new Date(invitation.expires_at).toLocaleDateString()}.

If you have any questions, please contact the person who invited you.`;

    window.location.href = `mailto:${invitation.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  if (loading) {
    return <div>Loading invitations...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Invitations</CardTitle>
        <CardDescription>
          Create and manage invitations for new users
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Create Invitation Form */}
        <div className="space-y-4 border-b pb-6">
          <h3 className="text-lg font-semibold">Create New Invitation</h3>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="is-admin"
                checked={isAdmin}
                onCheckedChange={setIsAdmin}
              />
              <Label htmlFor="is-admin">Grant admin privileges</Label>
            </div>
            <Button onClick={createInvitation} disabled={creating}>
              {creating ? 'Creating...' : 'Create Invitation'}
            </Button>
          </div>
        </div>

        {/* Invitation List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Existing Invitations</h3>
            <div className="flex items-center space-x-2">
              <Switch
                id="show-used"
                checked={showUsed}
                onCheckedChange={setShowUsed}
              />
              <Label htmlFor="show-used">Show used invitations</Label>
            </div>
          </div>

          {invitations.length === 0 ? (
            <p className="text-muted-foreground">No invitations found</p>
          ) : (
            <div className="space-y-2">
              {invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className={`flex items-center justify-between p-4 border rounded-lg ${
                    invitation.used ? 'bg-muted' : 
                    invitation.is_expired ? 'bg-red-50 dark:bg-red-900/10' : ''
                  }`}
                >
                  <div className="space-y-1">
                    <p className="font-medium">{invitation.email}</p>
                    <p className="text-sm text-muted-foreground">
                      Invited by {invitation.invited_by} on{' '}
                      {new Date(invitation.created_at).toLocaleDateString()}
                    </p>
                    {invitation.used ? (
                      <p className="text-sm text-green-600 dark:text-green-400">
                        Used by {invitation.used_by}
                      </p>
                    ) : invitation.is_expired ? (
                      <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Expired on {new Date(invitation.expires_at).toLocaleDateString()}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Expires on {new Date(invitation.expires_at).toLocaleDateString()}
                      </p>
                    )}
                    {invitation.is_admin && (
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                        Admin
                      </span>
                    )}
                  </div>
                  {!invitation.used && !invitation.is_expired && (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyInvitationUrl(invitation)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => sendInvitationEmail(invitation)}
                      >
                        <Mail className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteInvitation(invitation.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}