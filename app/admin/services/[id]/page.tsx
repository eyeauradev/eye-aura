"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { servicesService } from "@/services/firestore";
import { ArrowLeft, Edit2, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";
import { PremiumButton } from "@/components/premium";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TYPOGRAPHY } from "@/lib/design-tokens";

import Link from "next/link";
import type { ServiceDocument } from "@/types/firestore";

export default function AdminServiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [service, setService] = useState<ServiceDocument | null>(null);

  useEffect(() => {
    async function loadService() {
      if (!params.id) return;

      try {
        setLoading(true);
        const serviceData = await servicesService.getById(params.id as string);
        setService(serviceData);
      } catch (error) {
        console.error("Error loading service:", error);
      } finally {
        setLoading(false);
      }
    }

    loadService();
  }, [params.id]);

  const handleToggleService = async () => {
    if (!service) return;

    try {
      await servicesService.update(service.id, { isActive: !service.isActive });
      setService({ ...service, isActive: !service.isActive });
    } catch (error) {
      console.error("Error toggling service:", error);
      alert("Failed to update service status");
    }
  };

  const handleDeleteService = async () => {
    if (!service) return;
    if (!confirm("Are you sure you want to delete this service? This action cannot be undone.")) return;

    try {
      await servicesService.delete(service.id);
      router.push("/admin/services");
    } catch (error) {
      console.error("Error deleting service:", error);
      alert("Failed to delete service");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading service details...</p>
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="border-primary/10 bg-primary/5">
          <CardContent className="p-12 text-center">
            <p className="text-lg text-muted-foreground">Service not found</p>
            <Link href="/admin/services">
              <PremiumButton variant="outline" className="mt-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Services
              </PremiumButton>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/services">
            <PremiumButton variant="ghost" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Services
            </PremiumButton>
          </Link>
          <h1 className={TYPOGRAPHY.heading}>{service.title}</h1>
          <p className={TYPOGRAPHY.label}>{service.type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</p>
        </div>
        <div className="flex gap-3">
          <PremiumButton onClick={handleToggleService} variant="outline">
            {service.isActive ? <ToggleRight className="h-4 w-4 mr-2" /> : <ToggleLeft className="h-4 w-4 mr-2" />}
            {service.isActive ? "Disable" : "Enable"}
          </PremiumButton>
          <Link href={`/admin/services/${service.id}/edit`}>
            <PremiumButton variant="outline">
              <Edit2 className="h-4 w-4 mr-2" />
              Edit
            </PremiumButton>
          </Link>
          <PremiumButton onClick={handleDeleteService} variant="outline" className="text-red-600 hover:text-red-700">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </PremiumButton>
        </div>
      </div>

      
        <Card className="border-primary/10">
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="text-lg">Service Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Status</p>
              {service.isActive ? (
                <Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge>
              ) : (
                <Badge className="bg-gray-100 text-gray-800 border-gray-200">Inactive</Badge>
              )}
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-1">Description</p>
              <p className="text-primary">{service.description}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Price</p>
                <p className="font-medium text-primary">{service.currency} {service.price}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Duration</p>
                <p className="font-medium text-primary">{service.duration} minutes</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Type</p>
                <p className="font-medium text-primary">{service.type.replace(/_/g, " ")}</p>
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-2">Suitable For</p>
              <div className="flex flex-wrap gap-2">
                {service.suitableFor.map((item) => (
                  <span key={item} className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm">
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-primary/10">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Created</p>
                <p className="font-medium text-primary">
                  {service.createdAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Last Updated</p>
                <p className="font-medium text-primary">
                  {service.updatedAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      
    </div>
  );
}
