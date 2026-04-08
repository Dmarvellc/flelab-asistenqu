import { NextResponse } from "next/server"
import { getDoctorDetail } from "@/services/hospital-network"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const doctor = await getDoctorDetail(id)
    if (!doctor) {
      return NextResponse.json({ error: "Doctor not found" }, { status: 404 })
    }
    return NextResponse.json(doctor)
  } catch (error) {
    console.error("Error fetching doctor detail:", error)
    return NextResponse.json({ error: "Failed to fetch doctor" }, { status: 500 })
  }
}
