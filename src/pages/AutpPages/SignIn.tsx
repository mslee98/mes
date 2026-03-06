import PageMeta from "../../components/common/PageMeta";
import SignInForm from "../../components/auth/SignInForm";
import AuthLayout from "./AuthPageLayout";

export default function SignIn() {
  return (
    <>
      <PageMeta
        title="아이쓰리시스템(주) | 로그인"
        description="아이쓰리시스템(주) | 로그인 페이지"
      />
      <AuthLayout>
        <SignInForm />
      </AuthLayout>
    </>
  );
}