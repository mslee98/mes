import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignUpForm from "../../components/auth/SignUpForm";

export default function SignUp() {
  return (
    <>
      <PageMeta
        title="아이쓰리시스템(주) | 회원가입"
        description="아이쓰리시스템(주) | 회원가입 페이지"
      />
      <AuthLayout>
        <SignUpForm />
      </AuthLayout>
    </>
  );
}