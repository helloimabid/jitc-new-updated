"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import {
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
  Pencil,
  Trash2,
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
  const [isDragging, setIsDragging] = useState(false)

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

      // Create a copy of the executives array
      const items = Array.from(executives)

      // Remove the dragged item from its original position
      const [reorderedItem] = items.splice(result.source.index, 1)

      // Insert the dragged item at its new position
      items.splice(result.destination.index, 0, reorderedItem)

      // Create a new array with updated display_order values
      const updatedItems = items.map((item, index) => ({
        ...item,
        display_order: index + 1,
      }))

      // Update the state with the new order
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

      // Save the new order to the database using the API endpoint
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
                                            className="h-10 w-10 rounded-full object-cover"
                                          />
                                        </div>
                                      )}
                                      <div>
                                        <h3 className="font-medium text-gray-900 dark:text-white">{executive.name}</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{executive.position}</p>
                                      </div>
                                    </div>
                                    <div className="flex flex-col space-y-1">
                                      <button
                                        onClick={() => handleMoveUp(index)}
                                        disabled={index === 0}
                                        className={`text-gray-600 dark:text-gray-400 ${
                                          index === 0 ? "opacity-30 cursor-not-allowed" : "hover:text-primary"
                                        }`}
                                        title="Move up"
                                      >
                                        <ArrowUp className="h-4 w-4" />
                                      </button>
                                      <button
                                        onClick={() => handleMoveDown(index)}
                                        disabled={index === filteredExecutives.length - 1}
                                        className={`text-gray-600 dark:text-gray-400 ${
                                          index === filteredExecutives.length - 1
                                            ? "opacity-30 cursor-not-allowed"
                                            : "hover:text-primary"
                                        }`}
                                        title="Move down"
                                      >
                                        <ArrowDown className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>
                ) : (
                  <div className="space-y-3 px-4">
                    {filteredExecutives.map((executive) => (
                      <motion.div
                        key={executive.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center">
                            {executive.image_url && (
                              <div className="flex-shrink-0 h-10 w-10 mr-3">
                                <img
                                  src={executive.image_url || "/placeholder.svg"}
                                  alt={executive.name}
                                  className="h-10 w-10 rounded-full object-cover"
                                />
                              </div>
                            )}
                            <div>
                              <h3 className="font-medium text-gray-900 dark:text-white">{executive.name}</h3>
                              <p className="text-sm text-gray-500 dark:text-gray-400">{executive.position}</p>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                setCurrentExecutive(executive)
                                setIsModalOpen(true)
                              }}
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                              title="Edit executive"
                            >
                              <Pencil className="h-4 w-4" />
                              <span className="sr-only">Edit</span>
                            </button>
                            <button
                              onClick={() => handleDelete(executive.id)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                              title="Delete executive"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Delete</span>
                            </button>
                          </div>
                        </div>
                        <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                          <p className="truncate">{executive.email}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Desktop table view */}
              <div className="hidden sm:block">
                {isReorderMode ? (
                  <DragDropContext onDragStart={() => setIsDragging(true)} onDragEnd={handleDragEnd}>
                    <Droppable droppableId="executives-desktop">
                      {(provided) => (
                        <table
                          className="min-w-full divide-y divide-gray-200 dark:divide-gray-700"
                          {...provided.droppableProps}
                          ref={provided.innerRef}
                        >
                          <thead className="bg-gray-50 dark:bg-gray-900">
                            <tr>
                              <th
                                scope="col"
                                className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-10"
                              >
                                #
                              </th>
                              <th
                                scope="col"
                                className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                              >
                                Name
                              </th>
                              <th
                                scope="col"
                                className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                              >
                                Position
                              </th>
                              <th
                                scope="col"
                                className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                              >
                                Email
                              </th>
                              <th
                                scope="col"
                                className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                              >
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredExecutives.map((executive, index) => (
                              <Draggable key={executive.id} draggableId={executive.id} index={index}>
                                {(provided, snapshot) => (
                                  <tr
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    className={`${
                                      snapshot.isDragging
                                        ? "bg-blue-50 dark:bg-blue-900/20"
                                        : "hover:bg-gray-50 dark:hover:bg-gray-700/30"
                                    } transition-colors duration-150`}
                                  >
                                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap" {...provided.dragHandleProps}>
                                      <div className="flex items-center justify-center text-gray-500 dark:text-gray-400">
                                        <MoveVertical className="h-5 w-5" />
                                        <span className="ml-2 text-sm">{index + 1}</span>
                                      </div>
                                    </td>
                                    <td className="px-3 sm:px-6 py-4">
                                      <div className="flex items-center">
                                        {executive.image_url && (
                                          <div className="flex-shrink-0 h-10 w-10 mr-3">
                                            <img
                                              src={executive.image_url || "/placeholder.svg"}
                                              alt={executive.name}
                                              className="h-10 w-10 rounded-full object-cover"
                                            />
                                          </div>
                                        )}
                                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                                          {executive.name}
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-3 sm:px-6 py-4">
                                      <div className="text-sm text-gray-500 dark:text-gray-400">
                                        {executive.position}
                                      </div>
                                    </td>
                                    <td className="px-3 sm:px-6 py-4">
                                      <div className="text-sm text-gray-500 dark:text-gray-400">{executive.email}</div>
                                    </td>
                                    <td className="px-3 sm:px-6 py-4 text-sm font-medium">
                                      <div className="flex space-x-3">
                                        <button
                                          onClick={() => handleMoveUp(index)}
                                          disabled={index === 0}
                                          className={`text-gray-600 dark:text-gray-400 ${
                                            index === 0 ? "opacity-30 cursor-not-allowed" : "hover:text-primary"
                                          }`}
                                          title="Move up"
                                        >
                                          <ArrowUp className="h-4 w-4" />
                                        </button>
                                        <button
                                          onClick={() => handleMoveDown(index)}
                                          disabled={index === filteredExecutives.length - 1}
                                          className={`text-gray-600 dark:text-gray-400 ${
                                            index === filteredExecutives.length - 1
                                              ? "opacity-30 cursor-not-allowed"
                                              : "hover:text-primary"
                                          }`}
                                          title="Move down"
                                        >
                                          <ArrowDown className="h-4 w-4" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </tbody>
                        </table>
                      )}
                    </Droppable>
                  </DragDropContext>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                      <tr>
                        <th
                          scope="col"
                          className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                        >
                          Name
                        </th>
                        <th
                          scope="col"
                          className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                        >
                          Position
                        </th>
                        <th
                          scope="col"
                          className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                        >
                          Email
                        </th>
                        <th
                          scope="col"
                          className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                        >
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {filteredExecutives.map((executive) => (
                        <motion.tr
                          key={executive.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors duration-150"
                        >
                          <td className="px-3 sm:px-6 py-4">
                            <div className="flex items-center">
                              {executive.image_url && (
                                <div className="flex-shrink-0 h-10 w-10 mr-3">
                                  <img
                                    src={executive.image_url || "/placeholder.svg"}
                                    alt={executive.name}
                                    className="h-10 w-10 rounded-full object-cover"
                                  />
                                </div>
                              )}
                              <div className="text-sm font-medium text-gray-900 dark:text-white">{executive.name}</div>
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-4">
                            <div className="text-sm text-gray-500 dark:text-gray-400">{executive.position}</div>
                          </td>
                          <td className="px-3 sm:px-6 py-4">
                            <div className="text-sm text-gray-500 dark:text-gray-400">{executive.email}</div>
                          </td>
                          <td className="px-3 sm:px-6 py-4 text-sm font-medium">
                            <div className="flex space-x-3">
                              <button
                                onClick={() => {
                                  setCurrentExecutive(executive)
                                  setIsModalOpen(true)
                                }}
                                className="inline-flex items-center text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                                title="Edit executive"
                              >
                                <Pencil className="h-4 w-4" />
                                <span className="sr-only">Edit</span>
                              </button>
                              <button
                                onClick={() => handleDelete(executive.id)}
                                className="inline-flex items-center text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                                title="Delete executive"
                              >
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Delete</span>
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div
            className="fixed inset-0 z-50 overflow-y-auto"
            aria-labelledby="modal-title"
            role="dialog"
            aria-modal="true"
          >
            <div
              className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75 backdrop-blur-sm transition-opacity pointer-events-auto"
                aria-hidden="true"
                onClick={handleCloseModal}
              ></motion.div>

              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
                &#8203;
              </span>

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left shadow-xl transform transition-all sm:my-8 sm:align-middle w-full sm:max-w-lg max-w-[calc(100%-2rem)] pointer-events-auto relative z-10"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-start p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white" id="modal-title">
                    {currentExecutive.id ? "Edit Executive" : "Add Executive"}
                  </h3>
                  <button
                    type="button"
                    className="bg-white dark:bg-gray-800 rounded-md text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
                    onClick={handleCloseModal}
                  >
                    <span className="sr-only">Close</span>
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="max-h-[70vh] overflow-y-auto p-4 sm:p-6">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Name
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={currentExecutive.name}
                        onChange={handleInputChange}
                        required
                        className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 dark:bg-gray-900 shadow-sm focus:border-primary focus:ring-primary sm:text-sm px-3 py-2"
                      />
                    </div>

                    <div>
                      <label htmlFor="position" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Position
                      </label>
                      <input
                        type="text"
                        id="position"
                        name="position"
                        value={currentExecutive.position}
                        onChange={handleInputChange}
                        required
                        className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 dark:bg-gray-900 shadow-sm focus:border-primary focus:ring-primary sm:text-sm px-3 py-2"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="display_order"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        Display Order
                      </label>
                      <input
                        type="number"
                        id="display_order"
                        name="display_order"
                        value={currentExecutive.display_order || ""}
                        onChange={(e) =>
                          setCurrentExecutive({
                            ...currentExecutive,
                            display_order: Number.parseInt(e.target.value) || 0,
                          })
                        }
                        className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 dark:bg-gray-900 shadow-sm focus:border-primary focus:ring-primary sm:text-sm px-3 py-2"
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Lower numbers appear first. Leave empty to add at the end.
                      </p>
                    </div>

                    <div>
                      <label htmlFor="bio" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Bio
                      </label>
                      <textarea
                        id="bio"
                        name="bio"
                        rows={3}
                        value={currentExecutive.bio}
                        onChange={handleInputChange}
                        required
                        className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 dark:bg-gray-900 shadow-sm focus:border-primary focus:ring-primary sm:text-sm px-3 py-2"
                      />
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Email
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={currentExecutive.email}
                        onChange={handleInputChange}
                        required
                        className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 dark:bg-gray-900 shadow-sm focus:border-primary focus:ring-primary sm:text-sm px-3 py-2"
                      />
                    </div>

                    <div>
                      <label htmlFor="image" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Image
                      </label>
                      <div className="mt-1 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        {(imageFile || currentExecutive.image_url) && (
                          <div className="flex-shrink-0">
                            <img
                              src={imageFile ? URL.createObjectURL(imageFile) : currentExecutive.image_url || ""}
                              alt="Preview"
                              className="h-16 w-16 rounded-full object-cover border border-gray-300 dark:border-gray-700"
                            />
                          </div>
                        )}
                        <label className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
                          <Upload className="mr-2 h-4 w-4" />
                          Choose File
                          <input
                            type="file"
                            id="image"
                            name="image"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="sr-only"
                          />
                        </label>
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="github_url"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        Facebook URL
                      </label>
                      <input
                        type="url"
                        id="github_url"
                        name="github_url"
                        value={currentExecutive.github_url || ""}
                        onChange={handleInputChange}
                        className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 dark:bg-gray-900 shadow-sm focus:border-primary focus:ring-primary sm:text-sm px-3 py-2"
                        placeholder="eg: https://www.facebook.com/username"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="linkedin_url"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        Instagram URL
                      </label>
                      <input
                        type="url"
                        id="linkedin_url"
                        name="linkedin_url"
                        value={currentExecutive.linkedin_url || ""}
                        onChange={handleInputChange}
                        className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 dark:bg-gray-900 shadow-sm focus:border-primary focus:ring-primary sm:text-sm px-3 py-2"
                        placeholder="eg: https://www.instagram.com/username"
                      />
                    </div>

                    <div className="mt-5 sm:mt-6 border-t border-gray-200 dark:border-gray-700 pt-5 flex flex-col-reverse sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                      <button
                        type="button"
                        className="mt-3 sm:mt-0 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:col-start-1 sm:text-sm"
                        onClick={handleCloseModal}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary text-base font-medium text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:col-start-2 sm:text-sm"
                      >
                        {loading ? (
                          <>
                            <svg
                              className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                            Processing...
                          </>
                        ) : (
                          <>{currentExecutive.id ? "Update" : "Create"}</>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}


                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75 backdrop-blur-sm transition-opacity pointer-events-auto"
                aria-hidden="true"
                onClick={handleCloseModal}
              ></motion.div>

              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
                &#8203;
              </span>

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left shadow-xl transform transition-all sm:my-8 sm:align-middle w-full sm:max-w-lg max-w-[calc(100%-2rem)] pointer-events-auto relative z-10"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-start p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white" id="modal-title">
                    {currentExecutive.id ? "Edit Executive" : "Add Executive"}
                  </h3>
                  <button
                    type="button"
                    className="bg-white dark:bg-gray-800 rounded-md text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
                    onClick={handleCloseModal}
                  >
                    <span className="sr-only">Close</span>
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="max-h-[70vh] overflow-y-auto p-4 sm:p-6">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Name
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={currentExecutive.name}
                        onChange={handleInputChange}
                        required
                        className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 dark:bg-gray-900 shadow-sm focus:border-primary focus:ring-primary sm:text-sm px-3 py-2"
                      />
                    </div>

                    <div>
                      <label htmlFor="position" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Position
                      </label>
                      <input
                        type="text"
                        id="position"
                        name="position"
                        value={currentExecutive.position}
                        onChange={handleInputChange}
                        required
                        className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 dark:bg-gray-900 shadow-sm focus:border-primary focus:ring-primary sm:text-sm px-3 py-2"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="display_order"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        Display Order
                      </label>
                      <input
                        type="number"
                        id="display_order"
                        name="display_order"
                        value={currentExecutive.display_order || ""}
                        onChange={(e) =>
                          setCurrentExecutive({
                            ...currentExecutive,
                            display_order: Number.parseInt(e.target.value) || 0,
                          })
                        }
                        className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 dark:bg-gray-900 shadow-sm focus:border-primary focus:ring-primary sm:text-sm px-3 py-2"
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Lower numbers appear first. Leave empty to add at the end.
                      </p>
                    </div>

                    <div>
                      <label htmlFor="bio" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Bio
                      </label>
                      <textarea
                        id="bio"
                        name="bio"
                        rows={3}
                        value={currentExecutive.bio}
                        onChange={handleInputChange}
                        required
                        className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 dark:bg-gray-900 shadow-sm focus:border-primary focus:ring-primary sm:text-sm px-3 py-2"
                      />
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Email
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={currentExecutive.email}
                        onChange={handleInputChange}
                        required
                        className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 dark:bg-gray-900 shadow-sm focus:border-primary focus:ring-primary sm:text-sm px-3 py-2"
                      />
                    </div>

                    <div>
                      <label htmlFor="image" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Image
                      </label>
                      <div className="mt-1 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        {(imageFile || currentExecutive.image_url) && (
                          <div className="flex-shrink-0">
                            <img
                              src={imageFile ? URL.createObjectURL(imageFile) : currentExecutive.image_url || ""}
                              alt="Preview"
                              className="h-16 w-16 rounded-full object-cover border border-gray-300 dark:border-gray-700"
                            />
                          </div>
                        )}
                        <label className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
                          <Upload className="mr-2 h-4 w-4" />
                          Choose File
                          <input
                            type="file"
                            id="image"
                            name="image"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="sr-only"
                          />
                        </label>
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="github_url"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        Facebook URL
                      </label>
                      <input
                        type="url"
                        id="github_url"
                        name="github_url"
                        value={currentExecutive.github_url || ""}
                        onChange={handleInputChange}
                        className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 dark:bg-gray-900 shadow-sm focus:border-primary focus:ring-primary sm:text-sm px-3 py-2"
                        placeholder="eg: https://www.facebook.com/username"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="linkedin_url"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        Instagram URL
                      </label>
                      <input
                        type="url"
                        id="linkedin_url"
                        name="linkedin_url"
                        value={currentExecutive.linkedin_url || ""}
                        onChange={handleInputChange}
                        className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 dark:bg-gray-900 shadow-sm focus:border-primary focus:ring-primary sm:text-sm px-3 py-2"
                        placeholder="eg: https://www.instagram.com/username"
                      />
                    </div>

                    <div className="mt-5 sm:mt-6 border-t border-gray-200 dark:border-gray-700 pt-5 flex flex-col-reverse sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                      <button
                        type="button"
                        className="mt-3 sm:mt-0 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:col-start-1 sm:text-sm"
                        onClick={handleCloseModal}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary text-base font-medium text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:col-start-2 sm:text-sm"
                      >
                        {loading ? (
                          <>
                            <svg
                              className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                            Processing...
                          </>
                        ) : (
                          <>{currentExecutive.id ? "Update" : "Create"}</>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

