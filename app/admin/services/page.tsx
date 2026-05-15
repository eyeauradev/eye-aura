"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { servicesService, usersService } from "@/services/firestore";
import { Plus, Search, Edit2, ToggleLeft, ToggleRight, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SectionContainer } from "@/components/section-container";
import Link from "next/link";
import type { ServiceDocument, UserDocument } from "@/types/firestore";

export default function AdminServicesPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<(ServiceDocument & { doctors: UserDocument[] })[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function loadServices() {
      try {
        setLoading(true);
        const allServices = await servicesService.getAll();
        const servicesWithDoctors = await Promise.all(
          allServices.map(async (service) => {
            const doctorIds = service.doctorIds || [];
            const doctors = await Promise.all(
              doctorIds.map((doctorId) => usersService.getById(doctorId))
            );
            return { ...service, doctors: doctors.filter((d) => d !== null) as UserDocument[] };
          })
        );
        setServices(servicesWithDoctors);
      } catch (error) {
        console.error("Error loading services:", error);
      } finally {
        setLoading(false);
      }
    }

    loadServices();
  }, []);

  const filteredServices = services.filter((service) =>
    service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    service.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleToggleService = async (serviceId: string, currentStatus: boolean) => {
    try {
      await servicesService.update(serviceId, { isActive: !currentStatus });
      setServices(services.map((s) => (s.id === serviceId ? { ...s, isActive: !currentStatus } : s)));
    } catch (error) {
      console.error("Error toggling service:", error);
      alert("Failed to update service status");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading services...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-4xl text-primary mb-2">Services</h1>
          <p className="text-xl text-muted-foreground">
            Manage consultation services
          </p>
        </div>
        <Link href="/admin/services/create">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Service
          </Button>
        </Link>
      </div>

      <SectionContainer>
        <Card className="border-primary/10">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">All Services</CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search services..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredServices.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">
                  {searchQuery ? "No services found matching your search" : "No services on the platform yet"}
                </p>
                {!searchQuery && (
                  <Link href="/admin/services/create">
                    <Button>Create First Service</Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredServices.map((service) => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    onToggle={handleToggleService}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </SectionContainer>
    </div>
  );
}

function ServiceCard({ service, onToggle }: { service: ServiceDocument & { doctors: UserDocument[] }; onToggle: (id: string, current: boolean) => void }) {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl bg-white/50 border border-primary/5 hover:border-primary/10 transition">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="text-primary font-bold text-lg">{service.title.charAt(0)}</span>
        </div>
        <div>
          <p className="font-medium text-primary">{service.title}</p>
          <p className="text-sm text-muted-foreground">{service.type}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground">
              {service.duration} min • {service.currency} {service.price}
            </span>
            {service.isActive ? (
              <Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge>
            ) : (
              <Badge className="bg-gray-100 text-gray-800 border-gray-200">Inactive</Badge>
            )}
          </div>
          {service.doctors.length > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <User className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {service.doctors.map((d) => d.displayName || "Doctor").join(", ")}
              </span>
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Link href={`/admin/services/${service.id}`}>
          <Button variant="ghost" size="icon">
            <Edit2 className="h-4 w-4" />
          </Button>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onToggle(service.id, service.isActive)}
          title={service.isActive ? "Disable service" : "Enable service"}
        >
          {service.isActive ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
