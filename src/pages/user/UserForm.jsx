import { useEffect, useState } from "react";
import { useApiMutation } from "../../hooks/useApiMutation";
import {
  CREATE_USER_LIST,
  PROFILE,
  UPDATE_PROFILE,
  GET_USER_BY_ID,
} from "../../api";
import usetoken from "../../api/usetoken";
import { message, Form, Spin } from "antd";
import { useNavigate, useParams } from "react-router-dom";
import ProfileForm from "../../components/user/ProfileForm";

const UserForm = () => {
  const token = usetoken();
  const { id } = useParams(); // 🔁 if `id` exists → Edit mode
  const isEditMode = Boolean(id);

  const { trigger: FetchTrigger, loading: fetchloading } = useApiMutation();
  const { trigger: SubmitTrigger, loading: submitloading } = useApiMutation();
  const [form] = Form.useForm();
  const [initialData, setInitialData] = useState({});
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [imageBaseUrl, setImageBaseUrl] = useState("");
  const [noImageUrl, setNoImageUrl] = useState("");
  const [addressForms, setAddressForms] = useState([
    { id: "", address_type: "", address: "", is_default: "No" },
  ]);

  const navigate = useNavigate();

  const fetchProfile = async () => {
    const res = await FetchTrigger({
      url: `${GET_USER_BY_ID}/${id}`,
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res || !res.data) return;

    const userData = res.data;
    setInitialData({
      ...userData,
      user_type: String(userData.user_type),
    });
    form.setFieldsValue(userData);

    const userImage = res.image_url?.find((i) => i.image_for == "User");
    const noImage = res.image_url?.find((i) => i.image_for == "No Image");
    setImageBaseUrl(userImage?.image_url || "");
    setNoImageUrl(noImage?.image_url || "");

    setAddressForms(
      Array.isArray(res.address)
        ? res.address.map((a) => ({
            id: a.id || "",
            address_type: a.address_type || "",
            address: a.address || "",
            is_default: a.is_default === "yes",
          }))
        : []
    );
  };

  useEffect(() => {
    if (isEditMode) fetchProfile();
  }, [id]);

  const handleAddressChange = (index, field, value) => {
    const updated = [...addressForms];
    if (field === "is_default" && value === true) {
      updated.forEach((_, i) => {
        updated[i].is_default = i === index;
      });
    } else {
      updated[index][field] = value;
    }
    setAddressForms(updated);
  };

  const addRow = () => {
    setAddressForms((prev) => [
      ...prev,
      { id: "", address_type: "", address: "", is_default: false },
    ]);
  };

  const removeRow = (index) => {
    if (addressForms.length > 1) {
      const updated = [...addressForms];
      updated.splice(index, 1);
      setAddressForms(updated);
    }
  };

  const handleSubmit = async (values) => {
    try {
      const formData = new FormData();
      formData.append("firm_name", values.firm_name || "");
      formData.append("gstin", values.gstin || "");
      formData.append("name", values.name);
      formData.append("email", values.email);
      formData.append("mobile", values.mobile);
      formData.append("whatsapp", values.whatsapp || "");
      formData.append("user_type", String(values.user_type));
      if (isEditMode) {
        formData.append("is_active", values.is_active ? "true" : "false");
      }
      if (avatarFile) {
        formData.append("avatar_photo", avatarFile);
      } else if (form.getFieldValue("avatar_photo")) {
        const imageUrl = `${imageBaseUrl}${form.getFieldValue("avatar_photo")}`;
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const file = new File([blob], "avatar.jpg", { type: blob.type });
        formData.append("avatar_photo", file);
      }

      formData.append(
        "address_data",
        JSON.stringify(
          addressForms.map((addr) => ({
            ...addr,
            is_default: addr.is_default ? "yes" : "no",
          }))
        )
      );

      await SubmitTrigger({
        url: isEditMode
          ? `${UPDATE_PROFILE}/${id}?_method=PUT`
          : CREATE_USER_LIST,
        method: "post",
        data: formData,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      message.success(
        `User ${isEditMode ? "updated" : "created"} successfully!`
      );
      navigate("/user");
    } catch (err) {
      console.error("Error submitting form:", err);
      message.error(`Failed to ${isEditMode ? "update" : "create"} user.`);
    }
  };

  return (
    <>
      {fetchloading ? (
        <div className="flex justify-center py-20">
          <Spin size="large" />
        </div>
      ) : (
        <ProfileForm
          loading={submitloading}
          type={isEditMode ? "edituser" : "createuser"}
          form={form}
          initialValues={initialData}
          onSubmit={handleSubmit}
          imageBaseUrl={imageBaseUrl}
          noImageUrl={noImageUrl}
          addressForms={addressForms}
          setAddressForms={setAddressForms}
          avatarFile={avatarFile}
          setAvatarFile={setAvatarFile}
          avatarPreview={avatarPreview}
          setAvatarPreview={setAvatarPreview}
          onAddressChange={handleAddressChange}
          onAddAddress={addRow}
          onRemoveAddress={removeRow}
        />
      )}
    </>
  );
};

export default UserForm;
