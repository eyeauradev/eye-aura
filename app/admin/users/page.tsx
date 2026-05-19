"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { usersService } from "@/services/firestore";
import { Search, User, Shield, Ban, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import type { UserDocument } from "@/types/firestore";

export default function AdminUsersPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserDocument[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  useEffect(() => {
    async function loadUsers() {
      try {
        setLoading(true);
        const allUsers = await usersService.getAll();
        setUsers(allUsers);
      } catch (error) {
        console.error("Error loading users:", error);
      } finally {
        setLoading(false);
      }
    }

    loadUsers();
  }, []);

  const filteredUsers = users.filter((u) => {
    const matchesSearch = 
      u.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    if (!user || userId === user.id) {
      alert("You cannot disable your own account");
      return;
    }

    try {
      await usersService.update(userId, { isActive: !currentStatus });
      setUsers(users.map((u) => (u.id === userId ? { ...u, isActive: !currentStatus } : u)));
    } catch (error) {
      console.error("Error toggling user status:", error);
      alert("Failed to update user status");
    }
  };

  const handleUpdateRole = async (userId: string, currentRole: string) => {
    if (!user || userId === user.id) {
      alert("You cannot change your own role");
      return;
    }

    const newRole = currentRole === "admin" ? "patient" : "admin";
    
    if (!confirm(`Are you sure you want to change this user's role to ${newRole}? This action cannot be undone.`)) {
      return;
    }

    try {
      await usersService.update(userId, { role: newRole as any });
      setUsers(users.map((u) => (u.id === userId ? { ...u, role: newRole as any } : u)));
    } catch (error) {
      console.error("Error updating user role:", error);
      alert("Failed to update user role");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl sm:text-4xl text-primary mb-1">Users</h1>
        <p className="text-sm sm:text-sm sm:text-xl text-muted-foreground">Manage platform users and roles</p>
      </div>

      
        <Card className="border-primary/10">
          <CardHeader className="p-3 sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-lg">All Users</CardTitle>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                <div className="relative w-full sm:w-auto">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-full sm:w-56"
                  />
                </div>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="px-4 py-2 border border-primary/10 rounded-xl bg-white/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="all">All Roles</option>
                  <option value="patient">Patients</option>
                  <option value="doctor">Doctors</option>
                  <option value="admin">Admins</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  {searchQuery || roleFilter !== "all" 
                    ? "No users found matching your filters" 
                    : "No users yet"}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredUsers.map((userItem) => (
                  <UserCard
                    key={userItem.id}
                    user={userItem}
                    isCurrentUser={user ? userItem.id === user.id : false}
                    onToggleStatus={handleToggleUserStatus}
                    onUpdateRole={handleUpdateRole}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      
    </div>
  );
}

function UserCard({ 
  user: userItem, 
  isCurrentUser, 
  onToggleStatus, 
  onUpdateRole 
}: { 
  user: UserDocument; 
  isCurrentUser: boolean; 
  onToggleStatus: (id: string, status: boolean) => void; 
  onUpdateRole: (id: string, role: string) => void; 
}) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-xl bg-white/50 border border-primary/5 hover:border-primary/10 transition">
      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <span className="text-primary font-bold">
          {userItem.displayName?.charAt(0) || userItem.email?.charAt(0)}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-primary truncate">{userItem.displayName || "Unknown"}</p>
        <p className="text-sm text-muted-foreground truncate">{userItem.email}</p>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          <Badge className={getRoleColor(userItem.role)}>{userItem.role}</Badge>
          {userItem.isActive ? (
            !userItem.isSuspended ? (
              <Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge>
            ) : (
              <Badge className="bg-orange-100 text-orange-800 border-orange-200">Suspended</Badge>
            )
          ) : (
            <Badge className="bg-gray-100 text-gray-800 border-gray-200">Disabled</Badge>
          )}
          {isCurrentUser && (
            <Badge className="bg-secondary text-white">You</Badge>
          )}
        </div>
      </div>
      <div className="flex items-center gap-0.5 shrink-0">
        {!isCurrentUser && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onToggleStatus(userItem.id, userItem.isActive)}
              title={userItem.isActive ? "Disable account" : "Enable account"}
            >
              {userItem.isActive ? <Ban className="h-3.5 w-3.5" /> : <CheckCircle className="h-3.5 w-3.5" />}
            </Button>
            {userItem.role !== "patient" && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onUpdateRole(userItem.id, userItem.role)}
                title="Change role"
              >
                <Shield className="h-3.5 w-3.5" />
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function getRoleColor(role: string): string {
  switch (role) {
    case "admin":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "doctor":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "patient":
      return "bg-green-100 text-green-800 border-green-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}
