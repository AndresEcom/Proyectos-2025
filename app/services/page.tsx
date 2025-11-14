"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, Filter, FileDown, Pencil, Trash2, Calendar } from "lucide-react"
import { format } from "date-fns"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { ServiceForm } from "@/components/services/service-form"
import { useToast } from "@/components/ui/use-toast"
import {
  getServices,
  createService,
  updateService,
  deleteService,
  exportServices,
  Service,
  CreateServiceDTO,
} from "@/lib/api/services"
import {
  formatPrice,
  formatDateTime,
  getServiceTypeLabel,
  getServiceStatusLabel,
} from "@/lib/utils"

export default function ServicesPage() {
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedService, setSelectedService] = useState<Service | undefined>()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Query para obtener servicios
  const { data: services, isLoading } = useQuery({
    queryKey: ["services", typeFilter, statusFilter],
    queryFn: () =>
      getServices({
        ...(typeFilter !== "all" && { type: typeFilter }),
        ...(statusFilter !== "all" && { status: statusFilter }),
      }),
  })

  // Mutation para crear servicio
  const createMutation = useMutation({
    mutationFn: createService,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] })
      setIsFormOpen(false)
      toast({
        title: "Servicio creado",
        description: "El servicio ha sido creado exitosamente",
      })
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo crear el servicio",
        variant: "destructive",
      })
    },
  })

  // Mutation para actualizar servicio
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateServiceDTO }) =>
      updateService(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] })
      setIsFormOpen(false)
      setSelectedService(undefined)
      toast({
        title: "Servicio actualizado",
        description: "El servicio ha sido actualizado exitosamente",
      })
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo actualizar el servicio",
        variant: "destructive",
      })
    },
  })

  // Mutation para eliminar servicio
  const deleteMutation = useMutation({
    mutationFn: deleteService,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] })
      toast({
        title: "Servicio eliminado",
        description: "El servicio ha sido eliminado exitosamente",
      })
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo eliminar el servicio",
        variant: "destructive",
      })
    },
  })

  const handleSubmit = async (data: CreateServiceDTO) => {
    if (selectedService) {
      await updateMutation.mutateAsync({ id: selectedService.id, data })
    } else {
      await createMutation.mutateAsync(data)
    }
  }

  const handleEdit = (service: Service) => {
    setSelectedService(service)
    setIsFormOpen(true)
  }

  const handleDelete = async (service: Service) => {
    if (
      confirm(
        `¿Estás seguro de eliminar el servicio para "${service.clientName}"?`
      )
    ) {
      await deleteMutation.mutateAsync(service.id)
    }
  }

  const handleNewService = () => {
    setSelectedService(undefined)
    setIsFormOpen(true)
  }

  const handleExport = async () => {
    const month = format(new Date(), "yyyy-MM")
    await exportServices(month)
    toast({
      title: "Exportación exitosa",
      description: `Servicios del mes ${month} exportados`,
    })
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDIENTE: "bg-yellow-100 text-yellow-800",
      CONFIRMADO: "bg-blue-100 text-blue-800",
      FINALIZADO: "bg-green-100 text-green-800",
      CANCELADO: "bg-red-100 text-red-800",
    }
    return colors[status] || "bg-gray-100 text-gray-800"
  }

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      FLETE: "bg-flete-light text-flete",
      MUDANZA: "bg-mudanza-light text-mudanza",
      ESCOMBROS: "bg-escombros-light text-escombros",
    }
    return colors[type] || "bg-gray-100 text-gray-800"
  }

  return (
    <div className="flex h-full flex-col">
      <Header
        title="Servicios"
        description="Gestiona todos los servicios agendados"
      />

      <div className="flex-1 space-y-4 p-6">
        {/* Barra de acciones */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="FLETE">Flete</SelectItem>
                <SelectItem value="MUDANZA">Mudanza</SelectItem>
                <SelectItem value="ESCOMBROS">Escombros</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                <SelectItem value="CONFIRMADO">Confirmado</SelectItem>
                <SelectItem value="FINALIZADO">Finalizado</SelectItem>
                <SelectItem value="CANCELADO">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              <FileDown className="mr-2 h-4 w-4" />
              Exportar
            </Button>
            <Button onClick={handleNewService}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Servicio
            </Button>
          </div>
        </div>

        {/* Lista de servicios */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">
            Cargando servicios...
          </div>
        ) : services && services.length > 0 ? (
          <div className="space-y-3">
            {services.map((service) => (
              <Card key={service.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={getTypeColor(service.type)}>
                              {getServiceTypeLabel(service.type)}
                            </Badge>
                            <Badge className={getStatusColor(service.status)}>
                              {getServiceStatusLabel(service.status)}
                            </Badge>
                          </div>
                          <h3 className="font-semibold text-lg">
                            {service.clientName}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {service.clientPhone}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-primary">
                            {formatPrice(service.price)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {formatDateTime(service.scheduledDate)}
                      </div>

                      {service.origin && (
                        <div className="text-sm">
                          <span className="font-medium">Origen:</span>{" "}
                          {service.origin}
                        </div>
                      )}

                      {service.destination && (
                        <div className="text-sm">
                          <span className="font-medium">Destino:</span>{" "}
                          {service.destination}
                        </div>
                      )}

                      {service.notes && (
                        <p className="text-sm text-muted-foreground italic">
                          {service.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(service)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(service)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                No hay servicios que coincidan con los filtros
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Formulario de servicio */}
      <ServiceForm
        service={selectedService}
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
