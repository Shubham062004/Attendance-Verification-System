from datetime import datetime

from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# Upload signature
# ---------------------------------------------------------------------------

class UploadSignatureResponse(BaseModel):
    """Cloudinary signed-upload parameters returned to the client."""
    signature: str
    api_key: str
    cloud_name: str
    timestamp: int
    folder: str
    public_id: str
    upload_url: str


# ---------------------------------------------------------------------------
# Evidence creation
# ---------------------------------------------------------------------------

class EvidenceCreateRequest(BaseModel):
    session_id: int = Field(..., description="ID of the attendance session")
    image_url: str = Field(..., description="Cloudinary secure URL of the uploaded selfie")
    image_public_id: str = Field(..., description="Cloudinary public_id of the uploaded selfie")
    image_size: int | None = Field(None, ge=0, description="File size in bytes")
    image_width: int | None = Field(None, ge=0, description="Image width in pixels")
    image_height: int | None = Field(None, ge=0, description="Image height in pixels")


# ---------------------------------------------------------------------------
# Responses
# ---------------------------------------------------------------------------

class AttendanceEvidenceResponse(BaseModel):
    id: int
    student_id: int
    session_id: int
    image_url: str
    image_public_id: str
    image_size: int | None = None
    image_width: int | None = None
    image_height: int | None = None
    uploaded_at: datetime

    class Config:
        from_attributes = True
