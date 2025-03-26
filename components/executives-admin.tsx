"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase"
import {
  Pencil,
  Trash2,
  Plus,
  Check,
  X,
  AlertCircle,
  Upload,
  Search,
  User,
  ArrowUp,
  ArrowDown,
  MoveVertical,
} from "lucide-react"
import { v4 as uuidv4 } from "uuid"
import { motion, AnimatePresence } from "framer-motion"
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd"

interface Executive {
  id: string
  name: string
  position: string
  bio: string
  image_url: string | null
  email: string
  github_url: string | null
  linkedin_url: string | null
  created_at: string
  updated_at: string
  display_order?: number | null
}

interface ExecutivesAdminProps {
  initialExecutives: Executive[]
}

export default function ExecutivesAdmin({ initialExecutives }: ExecutivesAdminProps) {
  const [executives, setExecutives] = useState<Executive[]>(() => {
    // Sort by display_order if available, otherwise by created_at
    return [...initialExecutives].sort((a, b) => {
      if (
        a.display_order !== null &&
        b.display_order !== null &&
        a.display_order !== undefined &&
        b.display_order !== undefined
      ) {
        return a.display_order - b.display_order
      }
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    })
  })
  const [filteredExecutives, setFilteredExecutives] = useState<Executive[]>(executives)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [isDragging, setIsDragging] = useState(false)
  const [currentExecutive, setCurrentExecutive] = useState<Executive>({
    id: "",
    name: "",
    position: "",
    bio: "",
    image_url: null,
    email: "",
    github_url: null,
    linkedin_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    display_order: null,
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [isReorderMode, setIsReorderMode] = useState(false)

  useEffect(() => {
    const filtered = executives.filter(
      (executive) =>
        executive.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        executive.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
        executive.email.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    setFilteredExecutives(filtered)
  }, [searchTerm, executives])

  const handleOpenModal = () => {
    setCurrentExecutive({
      id: "",
      name: "",
      position: "",
      bio: "",
      image_url: null,
      email: "",
      github_url: null,
      linkedin_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      display_order: executives.length > 0 ? Math.max(...executives.map((e) => e.display_order || 0)) + 1 : 1,
    })
    setImageFile(null)
    setIsModalOpen(true)
    setError(null)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setCurrentExecutive({
      id: "",
      name: "",
      position: "",
      bio: "",
      image_url: null,
      email: "",
      github_url: null,
      linkedin_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      display_order: null,
    })
    setImageFile(null)
    setError(null)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setCurrentExecutive({
      ...currentExecutive,
      [name]: value,
    })
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setImageFile(e.target.files[0])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const supabase = createClient()
      let imageUrl = currentExecutive.image_url

      // Upload image if a new one is selected
      if (imageFile) {
        const fileExt = imageFile.name.split(".").pop()
        const fileName = `${uuidv4()}.${fileExt}`
        const { error: uploadError, data } = await supabase.storage.from("executive-images").upload(fileName, imageFile)

        if (uploadError) throw uploadError

        imageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/executive-images/${fileName}`
      }

      // Determine display order for new executives
      let displayOrder = currentExecutive.display_order
      if (!displayOrder && currentExecutive.id === "") {
        // For new executives, put them at the end by default
        const maxOrder = executives.length > 0 ? Math.max(...executives.map((e) => e.display_order || 0), 0) : 0
        displayOrder = maxOrder + 1
      }

      const updatedExecutive = {
        ...currentExecutive,
        image_url: imageUrl,
        updated_at: new Date().toISOString(),
        display_order: displayOrder,
      }

      if (currentExecutive.id) {
        // Update existing executive
        const { error } = await supabase.from("executives").update(updatedExecutive).eq("id", currentExecutive.id)

        if (error) throw error

        setSuccessMessage("Executive updated successfully!")
        setExecutives(executives.map((exec) => (exec.id === currentExecutive.id ? updatedExecutive : exec)))
        setFilteredExecutives(
          filteredExecutives.map((exec) => (exec.id === currentExecutive.id ? updatedExecutive : exec)),
        )
      } else {
        // Create new executive
        const newExecutive = {
          ...updatedExecutive,
          id: uuidv4(),
          created_at: new Date().toISOString(),
        }

        const { error } = await supabase.from("executives").insert([newExecutive])

        if (error) throw error

        setSuccessMessage("Executive added successfully!")
        setExecutives([...executives, newExecutive])
        setFilteredExecutives([...filteredExecutives, newExecutive])
      }

      // Auto-dismiss success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null)
      }, 3000)

      handleCloseModal()
    } catch (err: any) {
      setError(err.message || "An error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this executive?")) {
      setLoading(true)
      setError(null)
      setSuccessMessage(null)

      try {
        const supabase = createClient()
        const { error } = await supabase.from("executives").delete().eq("id", id)

        if (error) throw error

        setSuccessMessage("Executive deleted successfully!")
        setExecutives(executives.filter((exec) => exec.id !== id))
        setFilteredExecutives(filteredExecutives.filter((exec) => exec.id !== id))

        // Auto-dismiss success message after 3 seconds
        setTimeout(() => {
          setSuccessMessage(null)
        }, 3000)
      } catch (err: any) {
        setError(err.message || "Failed to delete executive")
      } finally {
        setLoading(false)
      }
    }
  }

  const handleMoveUp = async (index: number) => {
    if (index <= 0) return // Already at the top

    try {
      setLoading(true)
      const newExecutives = [...executives]
      const executive = newExecutives[index]
      const executiveAbove = newExecutives[index - 1]

      // Swap display_order values
      const tempOrder = executive.display_order
      executive.display_order = executiveAbove.display_order
      executiveAbove.display_order = tempOrder

      // Swap positions in array
      newExecutives[index] = executiveAbove
      newExecutives[index - 1] = executive

      // Update in database
      const supabase = createClient()
      await Promise.all([
        supabase.from("executives").update({ display_order: executive.display_order }).eq("id", executive.id),
        supabase.from("executives").update({ display_order: executiveAbove.display_order }).eq("id", executiveAbove.id),
      ])

      setExecutives(newExecutives)
      setFilteredExecutives(
        filteredExecutives.map((exec) =>
          exec.id === executive.id ? executive : exec.id === executiveAbove.id ? executiveAbove : exec,
        ),
      )

      setSuccessMessage("Order updated successfully!")
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err: any) {
      setError(err.message || "Failed to update order")
    } finally {
      setLoading(false)
    }
  }

  const handleMoveDown = async (index: number) => {
    if (index >= executives.length - 1) return // Already at the bottom

    try {
      setLoading(true)
      const newExecutives = [...executives]
      const executive = newExecutives[index]
      const executiveBelow = newExecutives[index + 1]

      // Swap display_order values
      const tempOrder = executive.display_order
      executive.display_order = executiveBelow.display_order
      executiveBelow.display_order = tempOrder

      // Swap positions in array
      newExecutives[index] = executiveBelow
      newExecutives[index + 1] = executive

      // Update in database
      const supabase = createClient()
      await Promise.all([
        supabase.from("executives").update({ display_order: executive.display_order }).eq("id", executive.id),
        supabase.from("executives").update({ display_order: executiveBelow.display_order }).eq("id", executiveBelow.id),
      ])

      setExecutives(newExecutives)
      setFilteredExecutives(
        filteredExecutives.map((exec) =>
          exec.id === executive.id ? executive : exec.id === executiveBelow.id ? executiveBelow : exec,
        ),
      )

      setSuccessMessage("Order updated successfully!")
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err: any) {
      setError(err.message || "Failed to update order")
    } finally {
      setLoading(false)
    }
  }

  const handleDragEnd = async (result: any) => {
    setIsDragging(false)

    // Dropped outside the list
    if (!result.destination) return

    // No change in position
    if (result.destination.index === result.source.index) return

    try {
      setLoading(true)

      // Reorder the executives array
      const items = Array.from(executives)
      const [reorderedItem] = items.splice(result.source.index, 1)
      items.splice(result.destination.index, 0, reorderedItem)

      // Update display_order for all executives
      const updatedItems = items.map((item, index) => ({
        ...item,
        display_order: index + 1,
      }))

      setExecutives(updatedItems)

      // Update filtered executives if needed
      if (searchTerm) {
        setFilteredExecutives(
          updatedItems.filter(
            (executive) =>
              executive.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              executive.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
              executive.email.toLowerCase().includes(searchTerm.toLowerCase()),
          ),
        )
      } else {
        setFilteredExecutives(updatedItems)
      }

      // Save the new order to the database
      const response = await fetch("/api/reorder-executives", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          executiveIds: updatedItems.map((item) => item.id),
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update order in database")
      }

      setSuccessMessage("Order updated successfully!")
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err: any) {
      setError(err.message || "Failed to update order")
      // Revert to previous state if there was an error
      setExecutives([...executives])
      setFilteredExecutives([...filteredExecutives])
    } finally {
      setLoading(false)
    }
  }

  const toggleReorderMode = () => {
    setIsReorderMode(!isReorderMode)
    // Clear search when entering reorder mode
    if (!isReorderMode) {
      setSearchTerm("")
    }
  }

  return (
    <div className="w-full max-w-full px-4 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-white">Executives</h2>

        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {!isReorderMode && (
            <div className="relative w-full sm:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-500" />
              </div>
              <input
                type="text"
                placeholder="Search executives..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          )}

          <button
            onClick={toggleReorderMode}
            className={`inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium transition-colors duration-200 ${
              isReorderMode
                ? "text-white bg-amber-600 hover:bg-amber-700 focus:ring-amber-500"
                : "text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500"
            } focus:outline-none focus:ring-2 focus:ring-offset-2`}
          >
            <MoveVertical className="mr-2 h-4 w-4" />
            {isReorderMode ? "Exit Reorder Mode" : "Reorder Executives"}
          </button>

          <button
            onClick={handleOpenModal}
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors duration-200"
          >
            <Plus className="mr-2 h-4 w-4" /> Add Executive
          </button>
        </div>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded dark:bg-red-900/20 dark:text-red-400 flex items-center justify-between"
          >
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-700 dark:text-red-400 hover:text-red-900"
              title="Dismiss error"
            >
              <X className="h-5 w-5" />
            </button>
          </motion.div>
        )}

        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded dark:bg-green-900/20 dark:text-green-400 flex items-center justify-between"
          >
            <div className="flex items-center">
              <Check className="h-5 w-5 mr-2" />
              <span>{successMessage}</span>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-green-700 dark:text-green-400 hover:text-green-900"
              title="Dismiss success message"
            >
              <X className="h-5 w-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {isReorderMode && (
        <div className="mb-4 bg-amber-50 border-l-4 border-amber-500 text-amber-700 p-4 rounded dark:bg-amber-900/20 dark:text-amber-400">
          <div className="flex items-center">
            <MoveVertical className="h-5 w-5 mr-2" />
            <span>
              <strong>Reorder Mode:</strong> Drag and drop executives to change their order, or use the up/down arrows.
              Changes are saved automatically.
            </span>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden w-full">
        {loading && filteredExecutives.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredExecutives.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-full mb-4">
              <User className="h-6 w-6 text-gray-500 dark:text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No executives found</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md">
              {searchTerm ? "Try adjusting your search terms" : "Add an executive to get started"}
            </p>
          </div>
        ) : (
          <div className="w-full overflow-hidden">
            <div className="sm:overflow-x-auto -mx-4 sm:mx-0">
              {/* Mobile card view */}
              <div className="block sm:hidden">
                {isReorderMode ? (
                  <DragDropContext onDragStart={() => setIsDragging(true)} onDragEnd={handleDragEnd}>
                    <Droppable droppableId="executives-mobile">
                      {(provided) => (
                        <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3 px-4">
                          {filteredExecutives.map((executive, index) => (
                            <Draggable key={executive.id} draggableId={executive.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`bg-white dark:bg-gray-800 p-4 rounded-lg shadow border ${
                                    snapshot.isDragging
                                      ? "border-primary ring-2 ring-primary"
                                      : "border-gray-200 dark:border-gray-700"
                                  }`}
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex items-center">
                                      <div className="mr-3 text-gray-400">
                                        <MoveVertical className="h-5 w-5" />
                                      </div>
                                      {executive.image_url && (
                                        <div className="flex-shrink-0 h-10 w-10 mr-3">
                                          <img
                                            src={executive.image_url || "/placeholder.svg"}
                                            alt={executive.name}
                                            className="h-10 w-10 round